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
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  invitation_id UUID
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY,
  token VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INT DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_invitation') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_invitation FOREIGN KEY (invitation_id) REFERENCES user_invitations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1000);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

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
