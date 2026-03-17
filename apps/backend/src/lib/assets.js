const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const exifr = require('exifr');
const { spawnSync } = require('child_process');

const LIBRARY_PATH = process.env.MEDIA_LIBRARY_PATH || '/data/library';
const ORIGINALS_ROOT = path.join(LIBRARY_PATH, 'originals');
const TRASH_ROOT = process.env.MEDIA_TRASH_PATH || path.join(LIBRARY_PATH, 'trash');
const INDEX_DIR = path.join(LIBRARY_PATH, 'index');
const INDEX_FILE = path.join(INDEX_DIR, 'assets.json');

function ensureIndex() {
  fs.mkdirSync(ORIGINALS_ROOT, { recursive: true });
  fs.mkdirSync(TRASH_ROOT, { recursive: true });
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, JSON.stringify({ items: [] }, null, 2));
}

function readIndex() {
  ensureIndex();
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return { items: [] };
  }
}

function writeIndex(data) {
  ensureIndex();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2));
}

async function detectTakenAt(absPath, mime) {
  try {
    if (!mime?.startsWith('image/')) return null;

    const exif = await exifr.parse(absPath, {
      tiff: true,
      exif: true,
      gps: false,
      xmp: true,
      iptc: true,
    });

    const dt = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate;
    if (!dt) return null;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function buildPlayPathById(id) {
  const playDir = path.join(LIBRARY_PATH, 'derived', 'play');
  fs.mkdirSync(playDir, { recursive: true });
  return path.join(playDir, `${id}.mp4`);
}

function makeVideoPlayable(absPath, id) {
  const out = buildPlayPathById(id);

  const remux = spawnSync('ffmpeg', ['-y', '-i', absPath, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'ignore' });
  if (remux.status === 0 && fs.existsSync(out)) return out;

  const transcode = spawnSync('ffmpeg', [
    '-y',
    '-i', absPath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ], { stdio: 'ignore' });

  if (transcode.status === 0 && fs.existsSync(out)) return out;
  return null;
}

async function saveUploadedFile(file, user) {
  ensureIndex();
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const destDir = path.join(ORIGINALS_ROOT, yyyy, mm);
  fs.mkdirSync(destDir, { recursive: true });

  const ext = path.extname(file.originalname || '') || '';
  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  const absPath = path.join(destDir, fileName);
  try {
    fs.renameSync(file.path, absPath);
  } catch (e) {
    if (e && e.code === 'EXDEV') {
      fs.copyFileSync(file.path, absPath);
      fs.unlinkSync(file.path);
    } else {
      throw e;
    }
  }

  const uploadedAt = now.toISOString();
  const takenAt = (await detectTakenAt(absPath, file.mimetype)) || uploadedAt;

  const relPath = path.relative(LIBRARY_PATH, absPath).replaceAll('\\', '/');
  const isVideo = file.mimetype?.startsWith('video/');
  let playRelPath = null;
  if (isVideo) {
    const playable = makeVideoPlayable(absPath, id);
    if (playable) playRelPath = path.relative(LIBRARY_PATH, playable).replaceAll('\\', '/');
  }

  const item = {
    id,
    originalName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    owner: user?.sub || 'admin',
    uploadedAt,
    takenAt,
    relPath,
    playRelPath,
    ext,
    albumName: null,
    isDeleted: false,
    deletedAt: null,
    type: file.mimetype?.startsWith('image/') ? 'image' : file.mimetype?.startsWith('video/') ? 'video' : 'file',
  };

  const db = readIndex();
  db.items.unshift(item);
  writeIndex(db);

  return item;
}

function normalizeItem(x) {
  return {
    ...x,
    takenAt: x.takenAt || x.uploadedAt,
    albumName: x.albumName || null,
    playRelPath: x.playRelPath || null,
    isDeleted: Boolean(x.isDeleted),
    deletedAt: x.deletedAt || null,
  };
}

function listAssets(limit = 200, opts = {}) {
  const { includeTrash = false, onlyTrash = false } = opts;
  const db = readIndex();
  let items = db.items.map(normalizeItem);

  if (onlyTrash) items = items.filter((x) => x.isDeleted);
  else if (!includeTrash) items = items.filter((x) => !x.isDeleted);

  return items.slice(0, Math.max(1, Math.min(limit, 5000)));
}

function getAsset(id) {
  const db = readIndex();
  const item = db.items.find((x) => x.id === id) || null;
  if (!item) return null;
  return normalizeItem(item);
}

function getAbsPathFromAsset(asset) {
  return path.join(LIBRARY_PATH, asset.relPath);
}

function getPlayableAbsPathFromAsset(asset) {
  if (!asset.playRelPath) return null;
  return path.join(LIBRARY_PATH, asset.playRelPath);
}

function listAlbums() {
  const db = readIndex();
  const m = new Map();
  for (const it of db.items.map(normalizeItem)) {
    if (it.isDeleted) continue;
    if (!it.albumName) continue;
    m.set(it.albumName, (m.get(it.albumName) || 0) + 1);
  }
  return Array.from(m.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

function assignAlbum(ids = [], albumName = '') {
  const name = String(albumName || '').trim();
  if (!name) return { updated: 0 };

  const idSet = new Set(ids || []);
  const db = readIndex();
  let updated = 0;

  for (const it of db.items) {
    if (!idSet.has(it.id)) continue;
    if (it.isDeleted) continue;
    it.albumName = name;
    updated += 1;
  }

  writeIndex(db);
  return { updated };
}

function moveToTrash(ids = []) {
  const idSet = new Set(ids || []);
  const db = readIndex();
  let updated = 0;

  for (const it of db.items) {
    if (!idSet.has(it.id)) continue;
    const item = normalizeItem(it);
    if (item.isDeleted) continue;

    const oldAbs = path.join(LIBRARY_PATH, item.relPath || '');
    const ext = path.extname(item.originalName || '') || path.extname(item.relPath || '') || '';
    const trashDir = path.join(TRASH_ROOT, new Date().toISOString().slice(0, 10));
    fs.mkdirSync(trashDir, { recursive: true });
    const newAbs = path.join(trashDir, `${item.id}${ext}`);

    if (fs.existsSync(oldAbs)) {
      try {
        fs.renameSync(oldAbs, newAbs);
      } catch (e) {
        if (e && e.code === 'EXDEV') {
          fs.copyFileSync(oldAbs, newAbs);
          fs.unlinkSync(oldAbs);
        } else {
          throw e;
        }
      }
      it.relPath = path.relative(LIBRARY_PATH, newAbs).replaceAll('\\', '/');
    }

    it.isDeleted = true;
    it.deletedAt = new Date().toISOString();
    updated += 1;
  }

  writeIndex(db);
  return { updated };
}

function restoreFromTrash(ids = []) {
  const idSet = new Set(ids || []);
  const db = readIndex();
  let updated = 0;

  for (const it of db.items) {
    if (!idSet.has(it.id)) continue;
    const item = normalizeItem(it);
    if (!item.isDeleted) continue;

    const oldAbs = path.join(LIBRARY_PATH, item.relPath || '');
    const baseDate = new Date(item.takenAt || item.uploadedAt || Date.now());
    const yyyy = String(baseDate.getUTCFullYear());
    const mm = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
    const ext = path.extname(item.originalName || '') || path.extname(item.relPath || '') || '';
    const restoreDir = path.join(ORIGINALS_ROOT, yyyy, mm);
    fs.mkdirSync(restoreDir, { recursive: true });
    const newAbs = path.join(restoreDir, `${item.id}${ext}`);

    if (fs.existsSync(oldAbs)) {
      try {
        fs.renameSync(oldAbs, newAbs);
      } catch (e) {
        if (e && e.code === 'EXDEV') {
          fs.copyFileSync(oldAbs, newAbs);
          fs.unlinkSync(oldAbs);
        } else {
          throw e;
        }
      }
      it.relPath = path.relative(LIBRARY_PATH, newAbs).replaceAll('\\', '/');
    }

    it.isDeleted = false;
    it.deletedAt = null;
    updated += 1;
  }

  writeIndex(db);
  return { updated };
}

function purgeDeleted(ids = []) {
  const idSet = new Set(ids || []);
  const db = readIndex();
  let removed = 0;

  db.items = db.items.filter((it) => {
    if (!idSet.has(it.id)) return true;
    const item = normalizeItem(it);
    if (!item.isDeleted) return true;

    const abs = path.join(LIBRARY_PATH, item.relPath || '');
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {}

    if (item.playRelPath) {
      const playAbs = path.join(LIBRARY_PATH, item.playRelPath);
      try { if (fs.existsSync(playAbs)) fs.unlinkSync(playAbs); } catch {}
    }

    removed += 1;
    return false;
  });

  writeIndex(db);
  return { removed };
}

module.exports = {
  saveUploadedFile,
  listAssets,
  getAsset,
  getAbsPathFromAsset,
  getPlayableAbsPathFromAsset,
  listAlbums,
  assignAlbum,
  moveToTrash,
  restoreFromTrash,
  purgeDeleted,
  LIBRARY_PATH,
};
