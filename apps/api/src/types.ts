import type { Db } from './db';

export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

export type AppType = {
  Bindings: Env;
  Variables: { db: Db };
};
