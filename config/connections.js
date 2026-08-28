'use strict';

/**
 * Connections
 * (sails.config.connections)
 *
 * `Connections` are like "saved settings" for your adapters.  What's the difference between
 * a connection and an adapter, you might ask?  An adapter (e.g. `sails-mysql`) is generic--
 * it needs some additional information to work (e.g. your database host, password, user, etc.)
 * A `connection` is that additional information.
 *
 * Each model must have a `connection` property (a string) which is references the name of one
 * of these connections.  If it doesn't, the default `connection` configured in `config/models.js`
 * will be applied.  Of course, a connection can (and usually is) shared by multiple models.
 * .
 * Note: If you're using version control, you should put your passwords/api keys
 * in `config/local.js`, environment variables, or use another strategy.
 * (this is to prevent you inadvertently sensitive credentials up to your repository.)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.connections.html
 */
module.exports.connections = {
  /**
   * Local disk storage for DEVELOPMENT ONLY
   *
   * Installed by default.
   */
  localDiskDb: {
    adapter: 'sails-disk',
    filePath:  process.env.NODE_ENV == 'test' ? './.tmp/' : ( process.env.STORAGE_PATH || './kongadata/' ),
    fileName: process.env.NODE_ENV == 'test' ? 'localDiskDb.db' : 'konga.db'
  },

  /**
   * MySQL is the world's most popular relational database.
   * http://en.wikipedia.org/wiki/MySQL
   *
   * Run:
   * npm install sails-mysql
   */
  mysql: {
    adapter: 'sails-mysql',
    url: process.env.DB_URI || null,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_DATABASE || 'konga_database'
  },

  /**
   * MongoDB is the leading NoSQL database.
   * http://en.wikipedia.org/wiki/MongoDB
   *
   * Run:
   * npm install sails-mongo
   */
  mongo: {
    adapter: 'sails-mongo',
    url: process.env.DB_URI || null,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 27017,
    user: process.env.DB_USER ||  null,
    password: process.env.DB_PASSWORD ||  null,
    database: process.env.DB_DATABASE ||  'konga_database',
  },

  /**
   * PostgreSQL is another officially supported relational database.
   * http://en.wikipedia.org/wiki/PostgreSQL
   *
   * Tested against PostgreSQL 9.6, 12, 14, 16, 17 and 18.
   *
   * The adapter is Konga's own patched copy of sails-postgresql, which lives in
   * `api/adapters/sails-postgresql/` and is picked up automatically by Sails.
   * See that folder's README.md for what had to change to support PostgreSQL
   * 12+ (dropped `adsrc`/`consrc` catalog columns) and 14+ (SCRAM-SHA-256).
   */
  postgres: {
    adapter: 'sails-postgresql',
    url: process.env.DB_URI,
    host: process.env.DB_HOST || 'localhost',
    user:  process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin1!',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE ||'konga_database',
    // schema: process.env.DB_PG_SCHEMA ||'public',
    poolSize: process.env.DB_POOLSIZE || 10,

    // `ssl` accepts `false`, `true`, or any `tls.connect()` options object.
    //
    // node-postgres 8 verifies the server certificate when `ssl` is `true`,
    // which the driver Konga used before never did. To avoid breaking existing
    // deployments (managed Postgres services almost always present a
    // certificate signed by their own CA), `true` keeps the old, unverified
    // behaviour. Set DB_SSL_REJECT_UNAUTHORIZED=true to turn verification on --
    // or replace this value with e.g.
    // `{ ca: require('fs').readFileSync('/path/to/server-ca.pem').toString() }`.
    ssl: isTruthy(process.env.DB_SSL) ? {
      rejectUnauthorized: isTruthy(process.env.DB_SSL_REJECT_UNAUTHORIZED)
    } : false
  },

  /**
   * More adapters:
   * https://github.com/balderdashy/sails
   */

  'sqlserver': {
    adapter: 'sails-sqlserver',
    url: process.env.DB_URI || null,
    host: process.env.DB_HOST || 'localhost',
    user:  process.env.DB_USER || null,
    password: process.env.DB_PASSWORD || null,
    port: process.env.DB_PORT || 49150,
    database: process.env.DB_DATABASE ||'konga_database'
  },
};


/**
 * Interpret an environment variable as a boolean.
 * (`DB_SSL=false` used to switch SSL *on*, because any non-empty string is
 *  truthy in JS.)
 */
function isTruthy(value) {
  if (!value) return false;
  return ['false', '0', 'no', 'off'].indexOf(String(value).toLowerCase()) === -1;
}
