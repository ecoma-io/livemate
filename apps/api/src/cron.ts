import type { Db } from './db';
import { variants } from './db/schema';

export async function cleanOrphanedFiles(db: Db, bucket: R2Bucket) {
  const knownVariants = await db
    .select({ r2Key: variants.r2Key })
    .from(variants);
  const knownKeys = new Set(knownVariants.map((v) => v.r2Key));

  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix: 'audio/', cursor });

    for (const object of listed.objects) {
      if (!knownKeys.has(object.key)) {
        await bucket.delete(object.key);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
