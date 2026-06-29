const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const exifr = require('exifr');
const { spawnSync } = require('child_process');

const LIBRARY_PATH = path.resolve(process.env.MEDIA_LIBRARY_PATH || '/data/library');
const ORIGINALS_ROOT = path.resolve(LIBRARY_PATH, 'originals');
const TRASH_ROOT = path.resolve(process.env.MEDIA_TRASH_PATH || path.join(LIBRARY_PATH, 'trash'));
const INDEX_DIR = path.resolve(LIBRARY_PATH, 'index');
const INDEX_FILE = path.resolve(INDEX_DIR, 'assets.json');
let lastGoodIndex = { items: [] };

function ensureIndex() {
  fs.mkdirSync(ORIGINALS_ROOT, { recursive: true });
  fs.mkdirSync(TRASH_ROOT, { recursive: true });
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, JSON.stringify({ items: [] }, null, 2));
}

function readIndex() {
  ensureIndex();
  try {
    const parsed = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.items)) {
      lastGoodIndex = parsed;
      return parsed;
    }
    return lastGoodIndex;
  } catch {
    return lastGoodIndex;
  }
}

function writeIndex(data) {
  ensureIndex();
  const tmp = path.join(INDEX_DIR, `assets.json.tmp-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, INDEX_FILE);
  lastGoodIndex = data;
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

function buildHlsDirById(id) {
  const hlsDir = path.join(LIBRARY_PATH, 'derived', 'hls', id);
  fs.mkdirSync(hlsDir, { recursive: true });
  return hlsDir;
}

function makeVideoPlayable(absPath, id) {
  const out = buildPlayPathById(id);

  const transcode = spawnSync('ffmpeg', [
    '-y',
    '-i', absPath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'faster',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-maxrate', '10M',
    '-bufsize', '20M',
    '-g', '48',
    '-keyint_min', '48',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ], { stdio: 'ignore' });

  if (transcode.status === 0 && fs.existsSync(out)) return out;
  return null;
}

function probeVideoSize(absPath) {
  try {
    const p = spawnSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      absPath,
    ], { encoding: 'utf8' });

    if (p.status !== 0 || !p.stdout) return null;
    const json = JSON.parse(p.stdout);
    const s = json?.streams?.[0];
    const w = Number(s?.width || 0);
    const h = Number(s?.height || 0);
    if (w > 0 && h > 0) return { w, h };
  } catch {}
  return null;
}

function makeVideoHlsHigh(absPath, id) {
  const hlsDir = buildHlsDirById(id);
  const streamPath = path.join(hlsDir, 'stream.m3u8');
  const masterPath = path.join(hlsDir, 'master.m3u8');

  const transcode = spawnSync('ffmpeg', [
    '-y',
    '-i', absPath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'faster',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-maxrate', '10M',
    '-bufsize', '20M',
    '-g', '48',
    '-keyint_min', '48',
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-hls_time', '4',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', path.join(hlsDir, 'seg_%05d.ts'),
    streamPath,
  ], { stdio: 'ignore' });

  if (transcode.status !== 0 || !fs.existsSync(streamPath)) return null;

  const size = probeVideoSize(streamPath) || probeVideoSize(absPath);
  const res = size ? `${size.w}x${size.h}` : '1920x1080';

  const master = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-STREAM-INF:BANDWIDTH=12000000,AVERAGE-BANDWIDTH=8000000,RESOLUTION=${res},CODECS="avc1.640028,mp4a.40.2"`,
    'stream.m3u8',
    '',
  ].join('\n');
  fs.writeFileSync(masterPath, master);

  return {
    hlsDir,
    masterPath,
  };
}

function scheduleVideoDerivatives(id, absPath) {
  setTimeout(() => {
    try {
      const playable = makeVideoPlayable(absPath, id);
      const hls = makeVideoHlsHigh(absPath, id);

      const db = readIndex();
      const item = db.items.find((x) => x.id === id);
      if (!item) return;

      if (playable) item.playRelPath = path.relative(LIBRARY_PATH, playable).replaceAll('\\', '/');
      if (hls?.masterPath) item.hlsRelPath = path.relative(LIBRARY_PATH, hls.masterPath).replaceAll('\\', '/');
      item.processingStatus = 'ready';
      item.processingFinishedAt = new Date().toISOString();

      writeIndex(db);
    } catch {}
  }, 0);
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
  let takenAt = await detectTakenAt(absPath, file.mimetype);
  if (!takenAt && file.lastModified) {
    const parsed = Number(file.lastModified);
    const d = new Date(Number.isNaN(parsed) ? file.lastModified : parsed);
    if (!Number.isNaN(d.getTime())) {
      takenAt = d.toISOString();
    }
  }
  if (!takenAt) {
    takenAt = uploadedAt;
  }

  const relPath = path.relative(LIBRARY_PATH, absPath).replaceAll('\\', '/');
  const isVideo = file.mimetype?.startsWith('video/');

  const item = {
    id,
    originalName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    owner: user?.sub || 'admin',
    uploadedAt,
    takenAt,
    relPath,
    playRelPath: null,
    hlsRelPath: null,
    processingStatus: isVideo ? 'processing' : 'ready',
    processingStartedAt: isVideo ? uploadedAt : null,
    processingFinishedAt: null,
    ext,
    albumName: null,
    albumNames: [],
    isDeleted: false,
    deletedAt: null,
    type: file.mimetype?.startsWith('image/') ? 'image' : file.mimetype?.startsWith('video/') ? 'video' : 'file',
  };

  const db = readIndex();
  db.items.unshift(item);
  writeIndex(db);

  if (isVideo) scheduleVideoDerivatives(id, absPath);

  return item;
}

function normalizeItem(x) {
  return {
    ...x,
    takenAt: x.takenAt || x.uploadedAt,
    albumName: x.albumName || null,
    albumNames: Array.isArray(x.albumNames) ? x.albumNames : (x.albumName ? [x.albumName] : []),
    docProjectName: x.docProjectName || null,
    docProjectNames: Array.isArray(x.docProjectNames) ? x.docProjectNames : (x.docProjectName ? [x.docProjectName] : []),
    playRelPath: x.playRelPath || null,
    hlsRelPath: x.hlsRelPath || null,
    processingStatus: x.processingStatus || 'ready',
    processingStartedAt: x.processingStartedAt || null,
    processingFinishedAt: x.processingFinishedAt || null,
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

  // Sắp xếp theo ngày chụp (takenAt) giảm dần (mới nhất lên đầu)
  items.sort((a, b) => {
    const timeA = new Date(a.takenAt || a.uploadedAt || 0).getTime();
    const timeB = new Date(b.takenAt || b.uploadedAt || 0).getTime();
    return timeB - timeA;
  });

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

function getHlsAbsPathFromAsset(asset) {
  if (!asset.hlsRelPath) return null;
  return path.join(LIBRARY_PATH, asset.hlsRelPath);
}

function getHlsDirAbsPathFromAsset(asset) {
  const hls = getHlsAbsPathFromAsset(asset);
  if (!hls) return null;
  return path.dirname(hls);
}

function listAlbums() {
  const db = readIndex();
  const m = new Map();
  for (const it of db.items.map(normalizeItem)) {
    if (it.isDeleted) continue;
    const names = Array.isArray(it.albumNames) ? it.albumNames : (it.albumName ? [it.albumName] : []);
    for (const n of names) m.set(n, (m.get(n) || 0) + 1);
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
    const names = Array.isArray(it.albumNames) ? it.albumNames : (it.albumName ? [it.albumName] : []);
    if (!names.includes(name)) names.push(name);
    it.albumNames = names;
    it.albumName = names[0] || null;
    updated += 1;
  }

  writeIndex(db);
  return { updated };
}

function setAssetAlbums(id, albumNames = []) {
  const names = albumNames.map(x => String(x || '').trim()).filter(Boolean);
  const db = readIndex();
  const it = db.items.find((x) => x.id === id);
  if (!it) return { updated: 0 };

  it.albumNames = names;
  it.albumName = names[0] || null;
  writeIndex(db);
  return { updated: 1 };
}

function listDocProjects() {
  const db = readIndex();
  const m = new Map();
  for (const it of db.items.map(normalizeItem)) {
    if (it.isDeleted) continue;
    if (it.type === 'image' || it.type === 'video') continue;
    const names = Array.isArray(it.docProjectNames) ? it.docProjectNames : (it.docProjectName ? [it.docProjectName] : []);
    for (const n of names) m.set(n, (m.get(n) || 0) + 1);
  }
  return Array.from(m.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

function assignDocProject(ids = [], projectName = '') {
  const name = String(projectName || '').trim();
  if (!name) return { updated: 0 };

  const idSet = new Set(ids || []);
  const db = readIndex();
  let updated = 0;

  for (const it of db.items) {
    if (!idSet.has(it.id)) continue;
    if (it.isDeleted) continue;
    if (it.type === 'image' || it.type === 'video') continue;

    const names = Array.isArray(it.docProjectNames) ? it.docProjectNames : (it.docProjectName ? [it.docProjectName] : []);
    if (!names.includes(name)) names.push(name);
    it.docProjectNames = names;
    it.docProjectName = names[0] || null;
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

    if (item.hlsRelPath) {
      const hlsAbs = path.join(LIBRARY_PATH, item.hlsRelPath);
      try {
        const hlsDir = path.dirname(hlsAbs);
        if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true, force: true });
      } catch {}
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
  getHlsAbsPathFromAsset,
  getHlsDirAbsPathFromAsset,
  listAlbums,
  assignAlbum,
  setAssetAlbums,
  listDocProjects,
  assignDocProject,
  moveToTrash,
  restoreFromTrash,
  purgeDeleted,
  LIBRARY_PATH,
};
