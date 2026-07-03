import { runOrphanedCleanup } from '../lib/cleaner';
import * as db from '../lib/db';

async function main() {
  const isDryRun = !process.argv.includes('--write');
  try {
    await runOrphanedCleanup(isDryRun);
  } catch (err) {
    console.error('[Script] Error running cleanup:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
    process.exit(0);
  }
}

main();
