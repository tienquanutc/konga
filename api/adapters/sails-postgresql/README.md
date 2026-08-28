# sails-postgresql (Konga fork)

Vendored copy of [`sails-postgresql@0.11.4`](https://github.com/balderdashy/sails-postgresql/tree/v0.11.4)
— the last release that works with Waterline 0.12 / Sails 0.12, which is what Konga runs on.

Sails picks it up automatically because it lives in `api/adapters/<identity>/`, so
`config/connections.js` keeps using `adapter: 'sails-postgresql'` and nothing else in the
app had to change. The upstream npm package is no longer installed.

## Why the fork

The upstream 0.11.x adapter cannot talk to a modern PostgreSQL server:

| Problem | Symptom on PostgreSQL >= 12 / >= 14 | Fix |
| --- | --- | --- |
| `describe()` selects `pg_attrdef.adsrc` and `pg_constraint.consrc`, both **removed in PostgreSQL 12** | `error: column d.adsrc does not exist` on boot, no tables ever get created | `lib/adapter.js` now uses `pg_get_expr(d.adbin, d.adrelid)` and `pg_get_constraintdef(r.oid)` (available since PostgreSQL 8, so 9.x still works) |
| It pins `pg@4.5.5`, which has **no SCRAM-SHA-256 support**. PostgreSQL 14+ defaults `password_encryption` to `scram-sha-256`, and PostgreSQL 18 drops md5 entirely | `error: SASL authentication not supported` / `client password must be a string` | the fork uses the root `pg` dependency (`~8.14.1`, SCRAM capable, still runs on Node 12) |
| `pg.connect()` / the implicit global pool were **removed in `pg@7`** | `TypeError: pg.connect is not a function` | `lib/connection-pool.js` reimplements the exact `(err, client, done)` contract on top of `pg.Pool` |
| `stream()` referenced an undefined `Query` identifier, and `query.on('row')` row streaming was **removed in `pg@7`** | `ReferenceError: Query is not defined` on the first `.stream()` call (broken upstream too) | `stream()` builds its query with `Sequel` like `find()` does, then fetches through the pool and writes the rows out |
| lodash 3 only APIs (`_.pick(obj, fn)`, `_.uniq(arr, iteratee)`) | primary keys silently dropped from `CREATE TABLE` when resolved against lodash 4 | replaced with `_.pickBy` / `_.uniqBy` |
| `pg@8` verifies the server certificate by default, `pg@4` never did | existing `DB_SSL=true` deployments with a self-signed cert stop connecting | `lib/connection-pool.js` maps `ssl: true` to `{ rejectUnauthorized: false }`; pass an object to opt into verification |

## Files

- `lib/adapter.js`, `lib/utils.js`, `lib/processor.js` — upstream sources with the patches above.
- `lib/connection-pool.js` — new; the `pg@4` -> `pg@8` compatibility layer (pooling, `poolSize` -> `max`, `ssl` normalization, pool teardown).

## Verified against

PostgreSQL **9.6, 12, 14, 16, 17 and 18** (12 and up configured with `scram-sha-256`), from both
Node 22 and the `node:12.16-alpine` image the Dockerfile is built on. Coverage: first boot and
re-boot on an existing schema, table definition and description, CRUD, associations/joins, JSON /
text / float / datetime round trips, custom schemas, raw queries, 40 concurrent queries on a pool
of 5, `.stream()`, unique-violation mapping, TLS with and without certificate verification, pool
recovery after a database restart, no leaked connections after teardown, and a 9.6 dump restored
onto 18.

## Upgrading

`git diff` this folder against the upstream tarball to see the full delta:

```bash
npm pack sails-postgresql@0.11.4 && tar xzf sails-postgresql-0.11.4.tgz
diff -u package/lib/adapter.js api/adapters/sails-postgresql/lib/adapter.js
```
