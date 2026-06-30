const { Pool } = require('pg');
const fs = require('fs');

let connectionString = process.env.DATABASE_URL || 'postgresql://aethercloud:aethercloud_local_dev@localhost:5432/aethercloud';

// Check if we are running in docker or host to route host 'db' to 'localhost' appropriately
const isDocker = fs.existsSync('/.dockerenv');
if (!isDocker && (connectionString.includes('@db:') || connectionString.includes('@db/'))) {
  console.log('[Database] Detected running outside Docker. Rewriting host "db" to "localhost" in DATABASE_URL.');
  connectionString = connectionString.replace('@db:', '@localhost:').replace('@db/', '@localhost/');
}

const pool = new Pool({
  connectionString,
});

const schema = `
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY,
  original_name VARCHAR(500) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  owner VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL,
  rel_path VARCHAR(1000) NOT NULL,
  play_rel_path VARCHAR(1000),
  hls_rel_path VARCHAR(1000),
  processing_status VARCHAR(50) DEFAULT 'ready',
  processing_started_at TIMESTAMPTZ,
  processing_finished_at TIMESTAMPTZ,
  ext VARCHAR(50) NOT NULL,
  album_name VARCHAR(255),
  album_names TEXT[] DEFAULT '{}',
  doc_project_name VARCHAR(255),
  doc_project_names TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  type VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_taken_at ON assets (taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets (is_deleted);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type);
`;

async function initDb() {
  try {
    const client = await pool.connect();
    console.log('[Database] Connected to PostgreSQL successfully.');
    await client.query(schema);
    console.log('[Database] Table schemas initialized.');
    client.release();
  } catch (err) {
    console.error('[Database] Failed to connect or initialize schema:', err.message);
  }
}

// Auto-run schema check
initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
