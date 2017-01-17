'use strict';
const genericPool = require('generic-pool');
const DbDriver    = require('./lib/client');

module.exports.createPool = (clientConfig, poolConfig) => {
  let poolConfigDefaults = {
    min: 2,
    max: 10,
  };
  const factory = {
    create: () => {
      return new Promise((resolve, reject)=>{
        let client = DbDriver.createClient(clientConfig);
        client.connect();
        client.on('ready', ()=> {
          resolve(client);
        });
        client.on('error', (reason)=>{
          reject(reason);
        });
      });
    },
    destroy: (client) => {
      return new Promise((resolve)=>{
        client.on('end', ()=> resolve());
        client.destroy();
      });
    }
  };
  return genericPool.createPool(factory, Object.assign(poolConfigDefaults, poolConfig));
};

