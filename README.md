## More than just another GUI to [KONG Admin API](http://getkong.org)    [![Build Status](https://travis-ci.org/pantsel/konga.svg?branch=master)](https://travis-ci.org/pantsel/konga)    [![Gitter chat](https://badges.gitter.im/pantsel-konga/Lobby.png)](https://gitter.im/pantsel-konga/Lobby)


[![Dashboard](screenshots/bc3.png)](https://raw.githubusercontent.com/pantsel/konga/master/screenshots/bc2.png)

_Konga is not an official app. No affiliation with [Kong](https://www.konghq.com/)._

---

## About this fork

[github.com/tienquanutc/konga](https://github.com/tienquanutc/konga) — a fork of
[pantsel/konga](https://github.com/pantsel/konga), which has had no release since 2020.

**What this fork adds: Konga runs on modern PostgreSQL (tested on 9.6, 12, 14, 16, 17 and 18).**

Upstream Konga cannot start against any PostgreSQL newer than 11. It bundles
`sails-postgresql@0.11.4` — the last release compatible with Waterline 0.12 / Sails 0.12 — and
that adapter breaks twice on a modern server:

| Upstream problem | What you see | Since |
| --- | --- | --- |
| `describe()` reads `pg_attrdef.adsrc` and `pg_constraint.consrc`, two catalog columns that no longer exist | `error: column d.adsrc does not exist` at startup; Konga never creates its tables | PostgreSQL **12** |
| it pins `pg@4`, which predates SCRAM-SHA-256 | `SASL authentication not supported` / `client password must be a string` | PostgreSQL **14** (default), **18** (md5 removed entirely) |

The fix is a patched copy of the adapter in
[`api/adapters/sails-postgresql/`](./api/adapters/sails-postgresql/README.md), which Sails loads
automatically as a custom adapter, plus `pg ~8.14.1` as a top-level dependency. See that folder's
README for the full list of patches (catalog queries, `pg.connect` → `pg.Pool`, `stream()`,
lodash 4 fixes, TLS handling).

**Nothing else changes.** `DB_ADAPTER=postgres` keeps working as documented, PostgreSQL 9.6 → 11
behave exactly as before, and the `node:12.16-alpine` Docker build is untouched.

### Two notes when upgrading from upstream Konga

* **`DB_SSL=false` used to enable TLS.** Any non-empty string is truthy in JavaScript, so
  `DB_SSL=false` switched SSL *on*. It now means what it says. If you relied on the old
  behaviour, use `DB_SSL=true`.
* **Certificate verification stays off by default.** `pg@8` verifies the server certificate when
  `ssl` is `true`; `pg@4` never did. To avoid breaking deployments with a self-signed certificate,
  `DB_SSL=true` keeps the old, unverified behaviour — set `DB_SSL_REJECT_UNAUTHORIZED=true` to
  turn verification on.

### What was verified

Against real PostgreSQL 9.6, 12, 14, 16, 17 and 18 servers (12 and up with `scram-sha-256`):
first boot and re-boot on an existing schema, Konga's own test suite, the REST API
(registration, JWT login, CRUD, associations, filters, policies), TLS with and without
certificate verification, connection-pool recovery after a database restart, no leaked
connections after shutdown, a 9.6 dump restored onto 18, Node 12.16-alpine, and a full
`docker build` + run.

---

## Summary

- [**About this fork**](#about-this-fork)
- [**Discussions & Support**](#discussions--support)
- [**Features**](#features)
- [**Compatibility**](#compatibility)
- [**Prerequisites**](#prerequisites)
- [**Used libraries**](#used-libraries)
- [**Installation**](#installation)
- [**Configuration**](#configuration)
- [**Environment variables**](#environment-variables)
- [**Running Konga**](#running-konga)
- [**Upgrading**](#upgrading)
- [**FAQ**](#faq)
- [**More Kong related stuff**](#more-kong-related-stuff)
- [**License**](#license)

## Discussions & Support
If you need to discuss anything Konga related, we have a chatroom on Gitter:

[![Gitter chat](https://badges.gitter.im/pantsel-konga/Lobby.png)](https://gitter.im/pantsel-konga/Lobby)

## Features
* Manage all Kong Admin API Objects.
* Import Consumers from remote sources (Databases, files, APIs etc.).
* Manage multiple Kong Nodes.
* Backup, restore and migrate Kong Nodes using Snapshots.
* Monitor Node and API states using health checks.
* Email & Slack notifications.
* Multiple users.
* Easy database integration (MySQL, PostgreSQL 9.6 - 18, MongoDB).

## Compatibility
**From 0.14.0 onwards, Konga is ONLY compatible with Kong 1.x**

If you're on an older Kong version , use [this](https://github.com/pantsel/konga/tree/legacy) branch 
or `konga:legacy` from docker hub instead.

| | Supported |
| --- | --- |
| Kong | 1.x |
| Node.js | >= 8, <= 12.x (12.16 LTS recommended) |
| PostgreSQL | **9.6 - 18** (see [About this fork](#about-this-fork)) |
| MySQL | 5.x |
| MongoDB | 3.x |

## Prerequisites
- A running [Kong installation](https://getkong.org/) 
- Nodejs >= 8, <= 12.x (12.16 LTS is recommended)
- Npm

## Used libraries
* Sails.js, http://sailsjs.org/
* AngularJS, https://angularjs.org/

## Installation

Install `npm` and `node.js`. Instructions can be found [here](http://sailsjs.org/#/getStarted?q=what-os-do-i-need).

Install `bower`, ad `gulp` packages.
```
$ git clone https://github.com/tienquanutc/konga.git
$ cd konga
$ npm i
```

## Configuration
You can configure your  application to use your environment specified
settings.

There is an example configuration file on the root folder.

```
.env_example
```

Just copy this to `.env` and make necessary changes to it. Note that this
`.env` file is in .gitignore so it won't go to VCS at any point.

## Environment variables
These are the general environment variables Konga uses.

| VAR                | DESCRIPTION                                                                                                                | VALUES                                 | DEFAULT                                      |
|--------------------|----------------------------------------------------------------------------------------------------------------------------|----------------------------------------|----------------------------------------------|
| HOST               | The IP address that will be bind by Konga's server                                                                               | -                                      | '0.0.0.0'                                         |
| PORT               | The port that will be used by Konga's server                                                                               | -                                      | 1337                                         |
| NODE_ENV           | The environment                                                                                                            | `production`,`development`             | `development`                                |
| SSL_KEY_PATH       | If you want to use SSL, this will be the absolute path to the .key file. Both `SSL_KEY_PATH` & `SSL_CRT_PATH` must be set. | -                                      | null                                         |
| SSL_CRT_PATH       | If you want to use SSL, this will be the absolute path to the .crt file. Both `SSL_KEY_PATH` & `SSL_CRT_PATH` must be set. | -                                      | null                                         |
| KONGA_HOOK_TIMEOUT | The time in ms that Konga will wait for startup tasks to finish before exiting the process.                                | -                                      | 60000                                        |
| DB_ADAPTER         | The database that Konga will use. If not set, the localDisk db will be used.              | `mongo`,`mysql`,`postgres`     | -                                            |
| DB_URI             | The full db connection string. Depends on `DB_ADAPTER`. If this is set, no other DB related var is needed.                 | -                                      | -                                            |
| DB_HOST            | If `DB_URI` is not specified, this is the database host. Depends on `DB_ADAPTER`.                                          | -                                      | localhost                                    |
| DB_PORT            | If `DB_URI` is not specified, this is the database port.  Depends on `DB_ADAPTER`.                                         | -                                      | DB default.                                  |
| DB_USER            | If `DB_URI` is not specified, this is the database user. Depends on `DB_ADAPTER`.                                          | -                                      | -                                            |
| DB_PASSWORD        | If `DB_URI` is not specified, this is the database user's password. Depends on `DB_ADAPTER`.                               | -                                      | -                                            |
| DB_DATABASE        | If `DB_URI` is not specified, this is the name of Konga's db.  Depends on `DB_ADAPTER`.                                    | -                                      | `konga_database`                             |
| DB_PG_SCHEMA       | If using postgres as a database, this is the schema that will be used.                                                     | -                                      | `public`                                     |
| DB_SSL             | Connect to the database over TLS. Set to `false`/`0`/`no`/`off` (or leave unset) to disable.                               | true/false                             | false                                        |
| DB_SSL_REJECT_UNAUTHORIZED | Only used when `DB_SSL` is on. Set to `true` to verify the database server's certificate. Off by default, so self-signed certificates keep working. | true/false | false |
| KONGA_LOG_LEVEL    | The logging level                                                                                                          | `silly`,`debug`,`info`,`warn`,`error`  | `debug` on dev environment & `warn` on prod. |
| TOKEN_SECRET       | The secret that will be used to sign JWT tokens issued by Konga | - | - |
| NO_AUTH            | Run Konga without Authentication                                                                                           | true/false                             | -                                         |
| BASE_URL           | Define a base URL or relative path that Konga will be loaded from. Ex: www.example.com/konga                               | <string>                                     | -                                         |
| KONGA_SEED_USER_DATA_SOURCE_FILE           | Seed default users on first run. [Docs](./docs/SEED_DEFAULT_DATA.md).                               | <string>                                     | -                                         |
| KONGA_SEED_KONG_NODE_DATA_SOURCE_FILE      | Seed default Kong Admin API connections on first run [Docs](./docs/SEED_DEFAULT_DATA.md)                               | <string>                                     | -                                         |


### Databases Integration

Konga is bundled with It's own persistence mechanism for storing users and configuration.

A local persistent object store is used by default, which works great as a bundled, starter database (with the strict caveat that it is for non-production use only).

The application also supports some of the most popular databases out of the box:

1. MySQL
2. MongoDB
3. PostgreSQL (**9.6 - 18**)

In order to use them, set the appropriate env vars in your `.env` file.

#### PostgreSQL

Nothing special to configure — `DB_ADAPTER=postgres` uses the patched adapter shipped in
[`api/adapters/sails-postgresql/`](./api/adapters/sails-postgresql/README.md), which works on
every server from 9.6 to 18. See [About this fork](#about-this-fork) for why upstream Konga
cannot.

```dotenv
DB_ADAPTER=postgres
DB_URI=postgresql://konga:secret@postgres:5432/konga
# ...or the discrete form:
# DB_HOST=postgres
# DB_PORT=5432
# DB_USER=konga
# DB_PASSWORD=secret
# DB_DATABASE=konga
```

**TLS.** Set `DB_SSL=true` to connect over TLS. The server certificate is *not* verified by
default, which is what most managed PostgreSQL services (RDS, Cloud SQL, Azure, Supabase, ...)
need out of the box. Add `DB_SSL_REJECT_UNAUTHORIZED=true` once you trust the certificate chain:

```dotenv
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

For a private CA, set `ssl` to a full [`tls.connect()`](https://nodejs.org/api/tls.html) options
object in `config/connections.js`, e.g.
`ssl: { ca: require('fs').readFileSync('/certs/server-ca.pem').toString() }`.

**Creating the database.** When `NODE_ENV` is not `production`, Konga creates the database on
startup if it does not exist. In production, run the migration step once instead:

```
$ node ./bin/konga.js prepare --adapter postgres --uri postgresql://konga:secret@postgres:5432/konga
```

**Schema.** Set `DB_PG_SCHEMA` to put Konga's tables in a schema other than `public`; the
adapter creates it if needed.


## Running Konga

### Development
```
$ npm start
```
Konga GUI will be available at `http://localhost:1337`

### Production

***************************************************************************************** 
In case of `MySQL` or `PostgresSQL` adapters, Konga will not perform db migrations when running in production mode.

You can manually perform the migrations by calling ```$ node ./bin/konga.js  prepare``` 
, passing the args needed for the database connectivity.

For example: 

```
$ node ./bin/konga.js  prepare --adapter postgres --uri postgresql://localhost:5432/konga
```
The process will exit after all migrations are completed. 

*****************************************************************************************

Finally:
```
$ npm run production
```
Konga GUI will be available at `http://localhost:1337`


### Production Docker Image

> **The published `pantsel/konga` images do not contain the PostgreSQL 12+ fix.** They were built
> from upstream and will still fail with `column d.adsrc does not exist`. Build the image from
> this repository instead:
>
> ```
> $ git clone https://github.com/tienquanutc/konga.git
> $ cd konga
> $ docker build -t konga:pg .
> ```
>
> On Windows, clone with `git config --global core.autocrlf input` (or run the build from WSL) —
> see [FAQ #5](#5-docker-image-fails-with-exec-appstartsh-no-such-file-or-directory).

The following instructions assume that you have a running Kong instance following the
instructions from [Kong's docker hub](https://hub.docker.com/_/kong/)
```
$ docker pull pantsel/konga
$ docker run -p 1337:1337 \
             --network {{kong-network}} \ // optional
             --name konga \
             -e "NODE_ENV=production" \ // or "development" | defaults to 'development'
             -e "TOKEN_SECRET={{somerandomstring}}" \
             pantsel/konga
```

#### To use one of the supported databases

1. ##### Prepare the database
> **Note**: You can skip this step if using the `mongo` adapter.

You can prepare the database using an ephemeral container that runs the prepare command.

**Args**

argument  | description | default
----------|-------------|--------
-c      | command | -
-a      | adapter (can be `postgres` or `mysql`) | -
-u     | full database connection url | -

```
$ docker run --rm pantsel/konga:latest -c prepare -a {{adapter}} -u {{connection-uri}}
```


2. ##### Start Konga
```
$ docker run -p 1337:1337 
             --network {{kong-network}} \ // optional
             -e "TOKEN_SECRET={{somerandomstring}}" \
             -e "DB_ADAPTER=the-name-of-the-adapter" \ // 'mongo','postgres','sqlserver'  or 'mysql'
             -e "DB_HOST=your-db-hostname" \
             -e "DB_PORT=your-db-port" \ // Defaults to the default db port
             -e "DB_USER=your-db-user" \ // Omit if not relevant
             -e "DB_PASSWORD=your-db-password" \ // Omit if not relevant
             -e "DB_DATABASE=your-db-name" \ // Defaults to 'konga_database'
             -e "DB_PG_SCHEMA=my-schema"\ // Optionally define a schema when integrating with prostgres
             -e "NODE_ENV=production" \ // or 'development' | defaults to 'development'
             --name konga \
             pantsel/konga
             
             
 // Alternatively you can use the full connection string to connect to a database
 $ docker run -p 1337:1337 
              --network {{kong-network}} \ // optional
              -e "TOKEN_SECRET={{somerandomstring}}" \
              -e "DB_ADAPTER=the-name-of-the-adapter" \ // 'mongo','postgres','sqlserver'  or 'mysql'
              -e "DB_URI=full-connection-uri" \
              -e "NODE_ENV=production" \ // or 'development' | defaults to 'development'
              --name konga \
              pantsel/konga
```


The GUI will be available at `http://{your server's public ip}:1337`


[It is possible to seed default users on first install.](./docs/SEED_DEFAULT_DATA.md)

You may also configure Konga to authenticate via [LDAP](./docs/LDAP.md).


## Upgrading
In some cases a newer version of Konga may introduce changes in database schemas.
The only thing you need to do is to start Konga in dev mode once so that the migrations will be applied.
Then stop the app and run it again in production mode.

if you're using docker, you can lift an ephemeral container, as stated before:
```
$ docker run --rm pantsel/konga:latest -c prepare -a {{adapter}} -u {{connection-uri}}
```

## FAQ

##### 1. Getting blank page with `Uncaught ReferenceError: angular is not defined`

In some cases when running `npm install`, the bower dependencies are not installed properly.
You will need to cd into your project's root directory and install them manually by typing
```
$ npm run bower-deps
```

##### 2. Can't add/edit some plugin properties.
When a plugin property is an array, the input is handled by a chip component.
You will need to press `enter` after every value you type in
so that the component assigns it to an array index.
See issue [#48](https://github.com/pantsel/konga/issues/48) for reference.

##### 3. EACCES permission denied, mkdir '/kongadata/'.
If you see this error while trying to run Konga, it means that konga has no write permissions to
it's default data dir `/kongadata`.  You will just have to define the storage path yourself to 
a directory Konga will have access permissions via the env var `STORAGE_PATH`.

##### 4. The hook `grunt` is taking too long to load
The default timeout for the sails hooks to load is 60000. In some cases, depending on
the memory the host machine has available, startup tasks like code minification and uglyfication
may take longer to complete. You can fix that by setting then env var `KONGA_HOOK_TIMEOUT` to something
greater than 60000, like 120000.

##### 5. Docker image fails with `exec /app/start.sh: no such file or directory`
The file is there — its line endings are not. Git on Windows checks `start.sh` out with CRLF by
default (`core.autocrlf=true`), and the Linux kernel then cannot parse the `#!/bin/bash`
shebang. Re-clone with

```
$ git config --global core.autocrlf input
```

or build the image from WSL / a Linux host. As a one-off workaround you can convert the file in
place: `sed -i 's/$//' start.sh`.

##### 6. `error: column d.adsrc does not exist` on startup
You are running upstream Konga (or a `pantsel/konga` image) against PostgreSQL 12 or newer.
Use this fork — see [About this fork](#about-this-fork).

##### 7. `SASL authentication not supported` / `client password must be a string`
Your PostgreSQL is using `scram-sha-256` (the default since PostgreSQL 14) and upstream Konga's
`pg@4` driver cannot speak it. Use this fork — see [About this fork](#about-this-fork).


## More Kong related stuff
- [**Kong Admin proxy**](https://github.com/pantsel/kong-admin-proxy)
- [**Kong Middleman plugin**](https://github.com/pantsel/kong-middleman-plugin)

## Author

Panagis Tselentis — original author of [Konga](https://github.com/pantsel/konga).

PostgreSQL 12 - 18 support in this fork: [tienquanutc](https://github.com/tienquanutc).

## License
```
The MIT License (MIT)
=====================

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
