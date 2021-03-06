'use strict';
const debug = require('debug')('ssdb-client:ssdb');
const _ = require('lodash');
const { Errors } = require('./defs');

const TaskStates = {
  Queued   : Symbol('Queued'),
  Executed : Symbol('Executed'),
  Resovled : Symbol('ExecutionResolved'),
  Rejected : Symbol('ExecutionRejected')
};

class DeferredTask {
  constructor(cmd, args, timeout = 2 * 60 * 1000) {
    this.cmd  = cmd;
    this.args = args;
    this.timerStarted = false;
    this.isTimeout    = false;
    this.promise = new Promise( (resolve, reject ) => {
      this.resolveFunc = resolve;
      this.rejectFunc  = reject;
    });
    this.startTimer( timeout );
  }

  resolve(body) {
    this.clearTimer();
    debug(`DeferredTask[${this.cmd}] resolved: ${ body ? ( _.isObjectLike(body) ?  JSON.stringify(body, null, 2) : _.toString(body)) : '[NULL]' }`);
    this.resolveFunc( body );
  }

  reject(reason) {
    this.clearTimer();
    debug(`DeferredTask[${this.cmd}] reject: ${reason ?  ( _.isObjectLike(reason) ?  JSON.stringify(reason, null, 2) : _.toString(reason)) : '[Unknown]'}`);
    this.rejectFunc( reason );
  }

  startTimer( timeout ) {
    // wrap a promise with timeout
    // can only start once
    if (!this.timerStarted) {
      this.timerStarted = true;
      this.timer = setTimeout(() => this.timeoutTask(), timeout);
    }
  }
  clearTimer() {
    this.timer && clearTimeout( this.timer );
    // this.timerStarted = true;
  }

  timeoutTask() {
    this.isTimeout = true;
    this.reject(new Errors.SSDBTaskTimeoutError());
  }

}

DeferredTask.States = TaskStates;

module.exports = DeferredTask;
