/**
 * Created by user on 06/10/2017.
 */

'use strict'

// `pg@8` (required for PostgreSQL 14+ SCRAM-SHA-256 auth) is a top level
// dependency now, so require it by name instead of reaching into the adapter's
// own node_modules.
var pg = require("pg");
var dbConf = require("../../config/connections");
var pgPool = require("../../api/adapters/sails-postgresql/lib/connection-pool");

module.exports = {
  run : function (next) {

    console.log("Using postgres DB Adapter.");

    var self = this;

    // `pg@8` understands connection strings natively, so the hand rolled URL
    // parser that used to live here is gone. Everything else (ssl, host, port,
    // ...) is normalized exactly the way the adapter does it.
    var opts = pgPool.buildPoolConfig(dbConf.connections.postgres);

    // A single throwaway connection is enough to find out whether the database
    // exists; there is no reason to keep a pool around for it.
    var client = new pg.Client(opts);

    client.connect(function (err) {

      if (!err) {
        console.log("Database exists. Continue...");
        return closeClient(client, next);
      }

      if (err.code == "3D000") {

        var dbName = databaseNameOf(opts);

        if (!dbName) {
          console.error("The configured database does not exist and its name could not be determined. " +
            "Set DB_DATABASE, or include the database in DB_URI.");
          return closeClient(client, function () { next(err); });
        }

        console.log("Database `" + dbName + "` does not exist. Creating...");
        return closeClient(client, function () {
          self.create(opts, dbName, next);
        });
      }

      console.error("Failed to connect to DB", err);
      return closeClient(client, function () { next(err); });
    });
  },


  create : function(opts, dbName, next) {

    // Hook up to the `postgres` maintenance db so we can create a new one
    var client = new pg.Client(maintenanceOpts(opts));

    client.connect(function (err) {
      if (err) {
        console.log(err);
        return closeClient(client, function () { next(err); });
      }

      // `dbName` comes from the app's own configuration, and identifiers cannot
      // be parameterized, so quote it rather than interpolating it raw.
      client.query('CREATE DATABASE "' + dbName.replace(/"/g, '""') + '"', function (err) {

        closeClient(client, function () {

          if (err) {
            console.log("Failed to create `" + dbName + "`", err);
            return next(err);
          }

          console.log("Database `" + dbName + "` created! Continue...");
          return next();
        });
      });
    });
  }
}


/**
 * Close a client without ever letting a teardown problem mask the real result.
 */
function closeClient(client, cb) {
  try {
    var result = client.end(function () { cb(); });
    if (result && typeof result.then === 'function') result.then(cb, function () { cb(); });
  } catch (e) {
    cb();
  }
}


/**
 * The database segment of a connection string, e.g.
 * `postgresql://user:pass@host:5432/konga?sslmode=require` -> `konga`.
 */
var DB_IN_URL = /^([^:]+:\/\/[^\/]*\/)([^?#]*)/;


/**
 * Work out which database a pg config points at, whether it was given as a
 * connection string or as discrete options.
 */
function databaseNameOf(opts) {

  if (opts.connectionString) {
    var match = DB_IN_URL.exec(opts.connectionString);
    if (match && match[2]) return decodeURIComponent(match[2]);
    return null;
  }

  return opts.database || null;
}


/**
 * Same connection details, but pointed at the always-present `postgres`
 * database so that a `CREATE DATABASE` can be issued.
 */
function maintenanceOpts(opts) {

  var maintenance = {};
  Object.keys(opts).forEach(function (key) {
    maintenance[key] = opts[key];
  });

  if (maintenance.connectionString) {
    // Swap the database segment of the URL for `postgres`, keeping the query
    // string (sslmode & friends) intact. A connection string always wins over
    // a `database` property in pg, so it has to be rewritten here.
    maintenance.connectionString = maintenance.connectionString.replace(DB_IN_URL, '$1postgres');
  }

  maintenance.database = 'postgres';

  return maintenance;
}
