'use strict';
const debug = require('debug')('ssdb-client:client');
const util = require('util');
const net = require('net');
const EventEmitter = require('events');
const _ = require('lodash');
const { Commands, ResponseStatus, Errors } = require('./defs');
const Parser = require('./parser');
const DefferedCmd = require('./deferred');
const assert = require('assert');

const ClientState = {
  Pending      : Symbol('Pending'), // inited not try to connect yet
  Disconnected : Symbol('Disconnected'),
  Connecting   : Symbol('Connecting'),
  Connected    : Symbol('Connected'),
  Ready        : Symbol('Ready'),
  Reconnecting : Symbol('Reconnecting'),
  Destroying   : Symbol('Destroying'),
  FatalError   : Symbol('FatalError'),
};

class SSDBClient extends EventEmitter {

  constructor(configs) {
    super(configs);

    this.configs = Object.assign({
      port: 8888,
      host: '0.0.0.0',
      auth: undefined,
      timeout: 0,
      autoReconnect: true,
      reconnect: {
        delay:   150,
        backoff: 1.7,
        maxAttempts: 20,
        maxDelay   : 60000  // 1 minute
      }
    }, configs);

    this.parser = new Parser();
    this.state = ClientState.Pending;
    this.cmdQueue = [];
    this._registerCommands(Commands);
  }

  //----------------------------------------------------------------------
  // Interfaces
  //----------------------------------------------------------------------
  connect() {
    if (this.state !== ClientState.Pending
      && this.state !== ClientState.Disconnected
      && this.state !== ClientState.Reconnecting) return;

    this.socket = new net.Socket();
    // configure the socket
    this.socket.setEncoding('utf-8');
    this.socket.setTimeout(this.configs.timeout);

    // add listeners
    this.socket.on('connect', () => this.onSocketConnect());
    this.socket.on('data',    (chuck) => this.onSocketData(chuck));
    this.socket.on('drain',   () => this.onSocketDrain());
    this.socket.on('error',   (error) => this.onSocketError(error));
    this.socket.on('end',     () => this.onSocketEnd());
    this.socket.on('close',   (hadError) => this.onSocketClose(hadError));
    this.socket.on('timeout', () => this.onSocketTimeout());

    // connect
    if (this.state !== ClientState.Reconnecting) {
      this.state = ClientState.Connecting;
    }
    this.socket.connect({
      port: this.configs.port,
      host: this.configs.host,
    });
  }

  reconnect() {
    // reset cmd queue
    if (this.state === ClientState.Destroying) return;
    debug(`Socket [Reconnecting] from ${this.state.toString()}`);
    if (this.state !== ClientState.Reconnecting) {
      this.state = ClientState.Reconnecting;
      this.cmdQueue = this.cmdQueue.reduce( (ret, theTask) => {
        if (!theTask.isTimeout) {
          theTask.state = DefferedCmd.States.Queued;
          ret.push( theTask );
        }
        return ret;
      }, []);
      this.reconnectState = Object.assign({
        timer: null,
        attempts : 0
      }, this.configs.reconnect);
    }
    // let's try
    this.connect();
    this.reconnectState.attempts += 1;
    if (this.reconnectState.attempts <= this.configs.reconnect.maxAttempts) {
      let nextDelay = Math.floor(this.reconnectState.delay * this.configs.reconnect.backoff);
      this.reconnectState.delay = Math.min(this.reconnectState.maxDelay, nextDelay);
      this.reconnectState.timer = setTimeout(
        () => {
          if (this.socket && this.socket.writable) {
            // force reset if not connected.
            this._socketReset();
          }
          this.reconnect();
        },
        this.reconnectState.delay
      );
      debug(`Socket [Reconnecting] attemps=${ this.reconnectState.attempts }, next=${this.reconnectState.delay}`);
    } else {
      debug(`Socket [Reconnecting] failed after ${this.configs.reconnect.maxAttempts} attemps.`);
      this.destory();
    }

  }

  ready() {
    assert( this.state === ClientState.Connected, 'State[Ready] can only be transit from State[Connected].');
    this.state = ClientState.Ready;
    // performs all the queues cmd
    debug(`Socket [Ready], Queued Cmds [${this.cmdQueue.length}]`);
    this.cmdQueue.forEach( (theCmd) => {
      debug(`Cmds state => ${theCmd.state.toString()}`);
      if (theCmd.state === DefferedCmd.States.Queued) {
        if (theCmd.isTimeout) {
          theCmd.state = DefferedCmd.States.Rejected;
        } else {
          debug(`Exec Queued Cmd[${theCmd.cmd}]`);
          theCmd.state = DefferedCmd.States.Executed; // wait for response
          this.execute(theCmd.cmd, theCmd.args);
        }
      }
    });

    this.emit('ready');
  }

  destory() {
    debug('Socket [Destroying]');
    this.resetReconnectTimer();
    this.state = ClientState.Destroying;
    this.socket.destroySoon();
    this.socket.removeAllListeners();
    this.socket.unref();
    this.socket = null;
    this.parser.reset();
    this.emit('end');
  }

  execute(cmd, args) {
    //debug(`[SSDB] send [${cmd}] => ${args.toString()}`);
    let cmdBytes  = cmd.length;
    let lines = [ `${cmdBytes}\n${cmd}\n` ];
    args.forEach( (arg) => {
      let argStr = util.format('%s', arg);
      let bodyBytes = Buffer.byteLength( argStr );
      lines.push(`${bodyBytes}\n${argStr}\n`);
    });
    lines.push('\n');
    return this.socket.write( Buffer.from(lines.join('')) );
  }

  resetReconnectTimer() {
    this.reconnectState && this.reconnectState.timer && clearTimeout( this.reconnectState.timer );
  }

  //----------------------------------------------------------------------
  // event listeners
  //----------------------------------------------------------------------
  onSocketConnect() {
    debug('Socket [Connected]');
    this.resetReconnectTimer();
    this.state = ClientState.Connected;
    this.emit('connected');
    if (this.configs.auth) {
      debug('Authenticating ...');
      this.execute('auth', [this.configs.auth]);
    } else {
      this.ready();
    }
  }
  onSocketData(chuck) {
    this.parser.feed(chuck);
    // parse response
    let responses = [];
    let parsed;
    while( (parsed = this.parser.parse()) !== null) {
      responses.push( parsed );
    }
    if (responses.length === 0) return;
    responses.forEach( (response) => {
      let status = response[0];
      let data   = response.splice(1);
      let error  = null;
      switch (status) {
        case ResponseStatus.OK:
          // parse response body
          break;
        case ResponseStatus.NotFound:
          // not error
          break;
        case ResponseStatus.ClientError:
          error = new Errors.SSDBClientError();
          break;
        case ResponseStatus.Error:
          error = new Errors.SSDBQueryError();
          break;
        case ResponseStatus.Fail:
          error = new Errors.SSDBFailError();
          break
      }
      // pending auth response
      if (this.state === ClientState.Connected && this.configs.auth) {
        if (Parser.parseCmdResponse(Commands['auth'], data) === true) {
          this.ready();
        } else {
          throw new Errors.SSDBFatalError('Authentication failed, please check your pass');
        }
      }
      // Ready
      else if (this.state === ClientState.Ready) {
        // debug(`Will Finish, Queue Cmds[${this.cmdQueue.length}]`);
        let theCmd = null;
        do {
          theCmd = this.cmdQueue.shift();
        } while( theCmd && theCmd.state !== DefferedCmd.States.Executed);

        if (theCmd) {
          // debug(`Did Finish Cmd[${theCmd.cmd}], Queue Cmds[${this.cmdQueue.length}]`);
          if (!theCmd.isTimeout) {
            if (error) {
              theCmd.state = DefferedCmd.States.Rejected;
              theCmd.reject( error );
            } else {
              theCmd.state = DefferedCmd.States.Resovled;
              theCmd.resolve( Parser.parseCmdResponse(Commands[theCmd.cmd], data) );
            }
          }
        }
      }
    });
  }
  onSocketError(error) {
    debug(`Socket [Error] #${error.code}#, ${this.configs.autoReconnect ? 'try reconnect' : 'destroying'} ...`);
    // not pending reconnecting...
    if (this.state !== ClientState.Reconnecting) {
      this.state = ClientState.Disconnected;
      if (this.configs.autoReconnect) {
        this.reconnect();
      } else {
        this.destory();
      }
    }
  }
  onSocketTimeout() {
    debug(`Socket [Timeout] ${this.configs.autoReconnect ? 'try reconnect' : 'destroying'} ...`);
    this._socketReset();
    if (this.configs.autoReconnect) {
      if (this.state !== ClientState.Reconnecting) {
        this._socketReset();
        this.reconnect();
      }
    } else {
      this.destory();
    }
  }
  onSocketEnd() {
    debug('Socket [End]');
  }
  onSocketDrain() {
    debug('Socket [Drain]');
  }
  onSocketClose(hadError) {
    debug(`Socket [Close] reason ${hadError ? 'ERROR': 'IDLE'}`);
  }

  //----------------------------------------------------------------------
  // private
  //----------------------------------------------------------------------
  _registerCommands(commands) {
    Object.keys( commands ).forEach( (cmd) => {
      this[cmd] = (...args) => {
        // debug(`Call [${cmd}] with ${JSON.stringify(args)}`);
        let theCmd = new DefferedCmd(cmd, _.flatten(args));
        this._executeCmd(theCmd);
        return theCmd.promise;
      }
    });
  }

  _executeCmd(theCmdTask) {
    this.cmdQueue.push(theCmdTask);
    if (this.state === ClientState.Ready) {
      theCmdTask.state = DefferedCmd.States.Executed; // wait for response
      this.execute(theCmdTask.cmd, theCmdTask.args);
    } else {
      if (this.state === ClientState.Pending) {
        this.connect(); // first try
      }
      theCmdTask.state = DefferedCmd.States.Queued; // pending for execution
    }
  }

  _socketReset() {
    if (this.socket === null) return;
    this.socket.end();
    this.socket.destroy();
    this.socket.removeAllListeners();
    this.socket.unref();
    this.socket = null;
    if (this.state !== ClientState.Reconnecting) {
      this.state = ClientState.Disconnected;
    }
  }

  //----------------------------------------------------------------------
  // Factory
  //----------------------------------------------------------------------
  static createClient(configs) {
    return new SSDBClient(configs);
  }
}

module.exports = SSDBClient;
