/*---------------------------------------------------------------
  :: sails-postgresql (konga fork)
  -> connection-pool

  `pg@4` exposed a module level `pg.connect(config, cb)` helper backed by an
  implicit global pool. That helper was removed in `pg@7`, so this module
  reimplements it on top of the `pg.Pool` API while keeping the exact same
  `(err, client, done)` callback signature the adapter was written against.

  Everything else in the adapter stays untouched.
---------------------------------------------------------------*/

'use strict';

var pg = require('pg');

// One pool per distinct connection configuration, keyed the same way `pg@4`
// keyed its global pool.
var pools = {};

var NOOP = function() {};


/**
 * Normalize the `ssl` value coming from a waterline connection config into
 * something `pg@8` understands.
 *
 * `pg@4` never validated the server certificate. `pg@8` does by default, which
 * breaks every Postgres server using a self signed certificate (RDS, Azure,
 * docker images, ...). Keep the historical behaviour for the plain `ssl: true`
 * shorthand and let people opt into verification by passing a full object
 * (see `config/connections.js`).
 *
 * @param  {Boolean|String|Dictionary} ssl
 * @return {Boolean|Dictionary}
 */
function normalizeSsl(ssl) {

  if (ssl === undefined || ssl === null) return false;

  // Already a `tls.connect()` style options object -> pass it straight through.
  if (typeof ssl === 'object') return ssl;

  if (ssl === false || ssl === 'false' || ssl === '0' || ssl === 0) return false;

  return { rejectUnauthorized: false };
}
module.exports.normalizeSsl = normalizeSsl;


/**
 * Build a `pg@8` pool configuration out of a waterline connection config.
 *
 * @param  {Dictionary} connectionConfig
 * @return {Dictionary}
 */
function buildPoolConfig(connectionConfig) {

  connectionConfig = connectionConfig || {};

  var poolConfig = {};

  // If the connection details were supplied as a URL use that, otherwise
  // connect using the discrete host/port/user/... properties.
  if (connectionConfig.url) {
    poolConfig.connectionString = connectionConfig.url;
  }
  else {
    poolConfig.host = connectionConfig.host;
    poolConfig.port = connectionConfig.port;
    poolConfig.user = connectionConfig.user;
    poolConfig.password = connectionConfig.password;
    poolConfig.database = connectionConfig.database;
  }

  poolConfig.ssl = normalizeSsl(connectionConfig.ssl);

  // `poolSize` was the pg@4 name for what pg@8 calls `max`.
  var max = connectionConfig.max || connectionConfig.poolSize;
  if (max !== undefined && max !== null && max !== '') {
    poolConfig.max = Number(max);
  }

  // Pass through the remaining pg options people may have set on the
  // connection, if any.
  ['application_name', 'statement_timeout', 'query_timeout', 'keepAlive',
   'connectionTimeoutMillis', 'idleTimeoutMillis'].forEach(function(key) {
    if (connectionConfig[key] !== undefined) poolConfig[key] = connectionConfig[key];
  });

  return poolConfig;
}
module.exports.buildPoolConfig = buildPoolConfig;


/**
 * Get (or lazily create) the pool for a given connection config.
 *
 * @param  {Dictionary} connectionConfig
 * @return {pg.Pool}
 */
function getPool(connectionConfig) {

  var poolConfig = buildPoolConfig(connectionConfig);
  var key = JSON.stringify(poolConfig);

  if (!pools[key]) {
    var pool = new pg.Pool(poolConfig);

    // A client sitting idle in the pool can still blow up (server restart,
    // network hiccup, idle session timeout). `pg` emits that on the pool and
    // node kills the process when nothing is listening, so always listen.
    pool.on('error', function(err) {
      console.error('Postgresql pool error (the client will be discarded):', err && err.message);
    });

    pools[key] = pool;
  }

  return pools[key];
}
module.exports.getPool = getPool;


/**
 * Drop-in replacement for the removed `pg.connect(config, cb)`.
 *
 * @param  {Dictionary} connectionConfig
 * @param  {Function}   cb  -> fn(err, client, done)
 */
module.exports.connect = function connect(connectionConfig, cb) {

  var pool;
  try {
    pool = getPool(connectionConfig);
  } catch (e) {
    return cb(e, undefined, NOOP);
  }

  pool.connect(function(err, client, release) {
    // On failure `pg` does not always hand back a release function, but the
    // adapter calls `done()` unconditionally.
    return cb(err, client, release || NOOP);
  });
};


/**
 * Close every pool this process opened. Called on teardown so that
 * `sails.lower()` does not leave the event loop alive.
 *
 * @param  {Function} cb
 */
module.exports.endAll = function endAll(cb) {

  var keys = Object.keys(pools);
  var remaining = keys.length;

  if (!remaining) return cb();

  keys.forEach(function(key) {
    var pool = pools[key];
    delete pools[key];

    var settled = false;
    var done = function() {
      if (settled) return;
      settled = true;
      remaining--;
      if (remaining === 0) return cb();
    };

    try {
      // `pool.end()` returns a promise in pg@8; it also accepts a callback.
      var result = pool.end(done);
      if (result && typeof result.then === 'function') result.then(done, done);
    } catch (e) {
      done();
    }
  });
};
