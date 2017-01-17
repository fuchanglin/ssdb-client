'use strict';
const debug = require('debug')('ssdb-client:parser');
const { ReturnTypes } = require('./defs');

const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);

const KVListToObject = function(list) {
  let ret = {};
  if (typeof list === 'undefined') return ret;
  for(let idx = 0; idx < list.length; idx += 2) {
    ret[ list[idx] ] = list[idx + 1];
  }
  return ret;
};


class ProtocalParser {

  static parseCmdResponse(cmd, body) {
    let type = cmd.returnType || ReturnTypes.string;
    switch (type) {
      case ReturnTypes.int    : return parseInt(body[0], 10);
      case ReturnTypes.float  : return parseFloat(body[0]);
      case ReturnTypes.bool   : return !!parseInt(body[0], 10);
      case ReturnTypes.list   : return body;
      case ReturnTypes.string : return body[0];
      case ReturnTypes.object : return KVListToObject(body);
    }
  }

  constructor() {
    this.buf = null;
  }

  feed( chuck ) {
    // debug(`Feed ${ Buffer.isBuffer(chuck) ? "buffer": "string" } -> ${  JSON.stringify(chuck) }`);
    if (this.buf === null) {
      this.buf = Buffer.from( chuck );
    } else {
      this.buf = Buffer.concat([ this.buf, Buffer.from( chuck ) ]);
    }
  }

  parse() {
    let len    = this.buf.length;
    let curPos = 0;
    let ret    = [];
    while (len > 0) {
      // find Size
      let idx = this.buf.indexOf(LF, curPos);
      // find Size, not finished.
      if (idx === -1) {
        break;
      }
      // END - '\n' or '\r\n'
      if (idx === curPos || (idx - curPos === 1 && this.buf[curPos] === CR) ) {
        // response finished
        this.buf = this.buf.slice(idx + 1);
        // debug(`Parsed [Left:${this.buf.length}] => ${ JSON.stringify(ret)}`);
        return ret;
      }
      // parse Size
      let dataSize = parseInt(this.buf.slice(curPos, idx), 10);
      // debug(`Size => ${dataSize}`);

      // move
      len    -= (idx - curPos) + 1 + dataSize;
      curPos += (idx - curPos) + 1 + dataSize;

      // find Data, not finished.
      if (len < 0) {
        break;
      }
      // move to next
      if (len >= 1 && this.buf[curPos] === LF) {
        len    -= 1;
        curPos += 1;
      }
      else if (len >= 2 && this.buf[curPos] === CR && this.buf[curPos + 1] === LF) {
        len    -= 2;
        curPos += 2;
      }
      else {
        break;
      }
      let data = this.buf.slice(idx + 1, idx + 1 + dataSize).toString();
      // debug(`Data => ${data}`);
      ret.push( data );
    }
    return null; // data not ready
  }

  reset() {
    this.buf = null;
  }

}

module.exports = ProtocalParser;
