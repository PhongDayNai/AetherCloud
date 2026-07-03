import dotenv from 'dotenv';
import path from 'path';

// Nạp file .env trước khi khởi tạo connectionString để tránh lỗi nạp chậm trong cơ chế ESM / TS import hoisting
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Pool } from 'pg';
import fs from 'fs';
import crypto from 'crypto';
import { hashPassword, generateSalt } from './auth';

let connectionString = process.env.DATABASE_URL || 'postgresql://aethercloud:aethercloud_local_dev@localhost:5432/aethercloud';

// Check if we are running in docker or host to route host 'db' to 'localhost' appropriately
const isDocker = fs.existsSync('/.dockerenv');
if (!isDocker && (connectionString.includes('@db:') || connectionString.includes('@db/'))) {
  console.log('[Database] Detected running outside Docker. Rewriting host "db" to "localhost" in DATABASE_URL.');
  connectionString = connectionString.replace('@db:', '@localhost:').replace('@db/', '@localhost/');
}

export const pool = new Pool({
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

  -- Phase 2 migrations for assets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='owner_id') THEN
    ALTER TABLE assets ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='group_id') THEN
    ALTER TABLE assets ADD COLUMN group_id UUID;
  END IF;
  
  -- Cho phép owner có thể NULL
  ALTER TABLE assets ALTER COLUMN owner DROP NOT NULL;

  -- Phase 3 migrations for assets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='is_library') THEN
    ALTER TABLE assets ADD COLUMN is_library BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- Phase 3 Groups and Group Members
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

DO $$
BEGIN
  -- Thêm group_id vào bảng spaces
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spaces' AND column_name='group_id') THEN
    ALTER TABLE spaces ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
  END IF;
  -- Giữ nguyên owner_id của space là NOT NULL để xác định rõ người tạo
  ALTER TABLE spaces ALTER COLUMN owner_id SET NOT NULL;

  -- Thêm khóa ngoại cho group_id trong bảng assets trỏ đến groups(id) ON DELETE CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_group') THEN
    ALTER TABLE assets ADD CONSTRAINT fk_assets_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
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
  owner VARCHAR(100),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID,
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
  is_library BOOLEAN DEFAULT TRUE,
  type VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_taken_at ON assets (taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets (is_deleted);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type);
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets (owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_is_library ON assets (is_library);
CREATE INDEX IF NOT EXISTS idx_assets_pagination ON assets (owner_id, is_deleted, taken_at DESC, id DESC);

-- Tạo bảng Không gian con (Spaces)
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'journal' | 'collection' | 'project'
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_id);

-- Tạo bảng Bài viết (Posts) trong Không gian con
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_space ON posts(space_id);

-- Bảng trung gian liên kết Bài viết và Tệp tin (Post & Assets)
CREATE TABLE IF NOT EXISTS post_assets (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, asset_id)
);

-- Hỗ trợ thùng rác cho Space con (Spaces)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spaces' AND column_name = 'is_deleted') THEN
    ALTER TABLE spaces ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spaces' AND column_name = 'deleted_at') THEN
    ALTER TABLE spaces ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spaces_is_deleted ON spaces(is_deleted);
`;


async function seedAdmin() {
  try {
    const email = (process.env.AUTH_ADMIN_EMAIL || 'admin').trim().toLowerCase();
    const password = process.env.AUTH_ADMIN_PASSWORD || 'change_me_now';
    const name = 'System Admin';
    const role = 'admin';

    // 1. Kiểm tra xem tài khoản Admin có trùng email đã tồn tại trong DB chưa
    const adminCheckRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (adminCheckRes.rows.length > 0) {
      console.log('[Database/Seed] Tài khoản Admin đã tồn tại. Đang đồng bộ cập nhật mật khẩu mới từ tệp .env...');
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      
      await query(`
        UPDATE users 
        SET password_hash = $1, salt = $2, name = $3, role = $4, is_active = true
        WHERE email = $5
      `, [passwordHash, salt, name, role, email]);
      
      console.log('[Database/Seed] Cập nhật và đồng bộ mật khẩu Admin từ .env THÀNH CÔNG.');
      return;
    }

    // 2. Nếu chưa tồn tại, tạo mới
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const id = crypto.randomUUID();

    await query(`
      INSERT INTO users (id, email, password_hash, salt, name, role, must_change_password, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, email, passwordHash, salt, name, role, false, true]);

    console.log(`[Database/Seed] Đã tạo mới tài khoản Admin tự động thành công: ${email}`);
  } catch (err: any) {
    console.error('[Database/Seed] Lỗi khi tự động seed tài khoản Admin:', err.message);
  }
}

async function initDb() {
  try {
    const client = await pool.connect();
    console.log('[Database] Connected to PostgreSQL successfully.');
    await client.query(schema);
    console.log('[Database] Table schemas initialized.');
    client.release();
    
    // Tự động seed tài khoản Admin nếu chưa tồn tại hoặc cần đồng bộ mật khẩu
    await seedAdmin();
  } catch (err: any) {
    console.error('[Database] Failed to connect or initialize schema:', err.message);
  }
}

// Auto-run schema check
initDb();

export function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
