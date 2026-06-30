const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('../lib/db');

const LIBRARY_PATH = path.resolve(process.env.MEDIA_LIBRARY_PATH || '/data/library');
const INDEX_FILE = path.resolve(LIBRARY_PATH, 'index', 'assets.json');

async function migrate() {
  console.log('[Migration] Checking assets.json at:', INDEX_FILE);

  if (!fs.existsSync(INDEX_FILE)) {
    console.log('[Migration] No assets.json file found. Nothing to migrate.');
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (err) {
    console.error('[Migration] Failed to parse assets.json:', err.message);
    process.exit(1);
  }

  const items = data.items || [];
  console.log(`[Migration] Found ${items.length} items to migrate.`);

  if (items.length === 0) {
    console.log('[Migration] No items found in assets.json.');
    process.exit(0);
  }

  const queryText = `
    INSERT INTO assets (
      id, original_name, mime, size, owner, uploaded_at, taken_at, rel_path,
      play_rel_path, hls_rel_path, processing_status, processing_started_at,
      processing_finished_at, ext, album_name, album_names, doc_project_name,
      doc_project_names, tags, is_deleted, deleted_at, type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) ON CONFLICT (id) DO NOTHING
  `;

  let migratedCount = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const values = [
        item.id,
        item.originalName,
        item.mime,
        Number(item.size || 0),
        item.owner || 'admin',
        item.uploadedAt || new Date().toISOString(),
        item.takenAt || item.uploadedAt || new Date().toISOString(),
        item.relPath,
        item.playRelPath || null,
        item.hlsRelPath || null,
        item.processingStatus || 'ready',
        item.processingStartedAt || null,
        item.processingFinishedAt || null,
        item.ext || '',
        item.albumName || null,
        Array.isArray(item.albumNames) ? item.albumNames : (item.albumName ? [item.albumName] : []),
        item.docProjectName || null,
        Array.isArray(item.docProjectNames) ? item.docProjectNames : (item.docProjectName ? [item.docProjectName] : []),
        Array.isArray(item.tags) ? item.tags : [],
        Boolean(item.isDeleted),
        item.deletedAt || null,
        item.type || 'file'
      ];

      const res = await client.query(queryText, values);
      if (res.rowCount > 0) {
        migratedCount++;
      }
    }
    await client.query('COMMIT');
    console.log(`[Migration] Migrated ${migratedCount} new records into PostgreSQL.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed, database rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
