'use strict';
const debug       = require('debug')('ssdb-client:pool');
const genericPool = require('generic-pool');
const DbDriver    = require('./client');


module.exports.createPool = (clientConfig, poolConfig) => {

  let poolConfigDefaults = {
    min: 2,
    max: 10,
  };

  const factory = {
    create: function(){
      return new Promise(function(resolve){
        const client = DbDriver.createClient(clientConfig);
        client.once('ready', () => resolve(client) );
      })
    },

    destroy: function(client){
      return new Promise(function(resolve){
        client.on('end', () =>  resolve() );
        client.destroy();
      })
    }
  };
  return genericPool.createPool(factory, Object.assign(poolConfigDefaults, poolConfig));
};

