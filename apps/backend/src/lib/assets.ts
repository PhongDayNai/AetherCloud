import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import exifr from 'exifr';
import { spawnSync, spawn } from 'child_process';
import * as db from './db';

export interface Asset {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  ownerId: string;
  groupId: string | null;
  uploadedAt: string | null;
  takenAt: string | null;
  relPath: string;
  playRelPath: string | null;
  hlsRelPath: string | null;
  processingStatus: string;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
  ext: string;
  albumName: string | null;
  albumNames: string[];
  docProjectName: string | null;
  docProjectNames: string[];
  tags: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  type: string;
}

const isDocker = fs.existsSync('/.dockerenv');

export function resolveStoragePath(p: string): string {
  if (!isDocker && p.startsWith('/data')) {
    const localRoot = path.resolve(__dirname, '../../../storage');
    return p.replace('/data', localRoot);
  }
  return path.resolve(p);
}

export const LIBRARY_PATH = resolveStoragePath(process.env.MEDIA_LIBRARY_PATH || '/data/library');
const ORIGINALS_ROOT = path.resolve(LIBRARY_PATH, 'originals');
const TRASH_ROOT = resolveStoragePath(process.env.MEDIA_TRASH_PATH || path.join(LIBRARY_PATH, 'trash'));
const INDEX_DIR = path.resolve(LIBRARY_PATH, 'index');

function ensureDirs() {
  fs.mkdirSync(ORIGINALS_ROOT, { recursive: true });
  fs.mkdirSync(TRASH_ROOT, { recursive: true });
  fs.mkdirSync(INDEX_DIR, { recursive: true });
}

// Map PostgreSQL snake_case row columns to JavaScript camelCase object
export function fromDB(row: any): Asset | null {
  if (!row) return null;
  return {
    id: row.id,
    originalName: row.original_name,
    mime: row.mime,
    size: Number(row.size),
    ownerId: row.owner_id || row.owner, // fallback cho dữ liệu cũ nếu chưa chạy migration
    groupId: row.group_id || null,
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
    takenAt: row.taken_at ? new Date(row.taken_at).toISOString() : null,
    relPath: row.rel_path,
    playRelPath: row.play_rel_path,
    hlsRelPath: row.hls_rel_path,
    processingStatus: row.processing_status,
    processingStartedAt: row.processing_started_at ? new Date(row.processing_started_at).toISOString() : null,
    processingFinishedAt: row.processing_finished_at ? new Date(row.processing_finished_at).toISOString() : null,
    ext: row.ext,
    albumName: row.album_name,
    albumNames: row.album_names || [],
    docProjectName: row.doc_project_name,
    docProjectNames: row.doc_project_names || [],
    tags: row.tags || [],
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    type: row.type,
  };
}

async function detectTakenAt(absPath: string, mime?: string): Promise<string | null> {
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

function buildPlayPathById(id: string): string {
  const playDir = path.join(LIBRARY_PATH, 'derived', 'play');
  fs.mkdirSync(playDir, { recursive: true });
  return path.join(playDir, `${id}.mp4`);
}

function buildHlsDirById(id: string): string {
  const hlsDir = path.join(LIBRARY_PATH, 'derived', 'hls', id);
  fs.mkdirSync(hlsDir, { recursive: true });
  return hlsDir;
}

function executeFfmpegAsync(args: string[], strategyName: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`[Transcoder] Bắt đầu transcode bằng ${strategyName}...`);
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderrData = '';
    let lastLogTime = 0;

    child.stderr.on('data', (data: any) => {
      const str = data.toString();
      stderrData += str;

      const now = Date.now();
      if (now - lastLogTime > 4000) {
        const lines = str.split(/[\r\n]+/);
        const progressLine = lines.reverse().find((line: string) => line.includes('frame=') && line.includes('time='));
        if (progressLine) {
          console.log(`[Transcoder] Tiến độ [${strategyName}]: ${progressLine.trim()}`);
          lastLogTime = now;
        }
      }
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`[Transcoder] Transcode bằng ${strategyName} THÀNH CÔNG.`);
        resolve(true);
      } else {
        console.error(`[Transcoder] Transcode bằng ${strategyName} THẤT BẠI (Mã lỗi: ${code}).`);
        const lines = stderrData.split('\n').filter(Boolean).slice(-10).join('\n');
        console.error(`[Transcoder] Chi tiết lỗi ffmpeg:\n${lines}`);
        resolve(false);
      }
    });

    child.on('error', (err: any) => {
      console.error(`[Transcoder] Không thể khởi chạy ffmpeg cho ${strategyName}:`, err.message);
      resolve(false);
    });
  });
}

async function transcodeWithFallback(getArgsFn: (strategy: string) => string[], outPath: string): Promise<boolean> {
  // Strategy 1: Nvidia NVENC (dGPU)
  const nvencArgs = getArgsFn('nvenc');
  const nvencOk = await executeFfmpegAsync(nvencArgs, 'Nvidia NVENC');
  if (nvencOk && fs.existsSync(outPath)) {
    return true;
  }
  console.log(`[Transcoder] NVENC kiểm tra thất bại: nvencOk=${nvencOk}, fileExists=${fs.existsSync(outPath)}`);
  try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}

  // Strategy 2: VA-API (Generic Intel/AMD iGPU/dGPU on Linux)
  if (fs.existsSync('/dev/dri/renderD128')) {
    const vaapiArgs = getArgsFn('vaapi');
    const vaapiOk = await executeFfmpegAsync(vaapiArgs, 'Intel/AMD VA-API');
    if (vaapiOk && fs.existsSync(outPath)) {
      return true;
    }
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
  } else {
    console.log('[Transcoder] Bỏ qua VA-API do không tìm thấy thiết bị /dev/dri/renderD128');
  }

  // Strategy 3: CPU Fallback (libx264)
  const cpuArgs = getArgsFn('cpu');
  const cpuOk = await executeFfmpegAsync(cpuArgs, 'CPU (libx264)');
  if (cpuOk && fs.existsSync(outPath)) {
    return true;
  }
  return false;
}

function makeVideoPlayable(absPath: string, id: string): Promise<string | null> {
  const out = buildPlayPathById(id);

  const getArgs = (strategy: string) => {
    if (strategy === 'nvenc') {
      return [
        '-y',
        '-i', absPath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'h264_nvenc',
        '-profile:v', 'main',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-cq', '24',
        '-bf', '0',
        '-maxrate', '10M',
        '-bufsize', '20M',
        '-g', '48',
        '-keyint_min', '48',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        out,
      ];
    }
    if (strategy === 'vaapi') {
      return [
        '-y',
        '-hwaccel', 'vaapi',
        '-hwaccel_device', '/dev/dri/renderD128',
        '-hwaccel_output_format', 'vaapi',
        '-i', absPath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'h264_vaapi',
        '-profile:v', 'main',
        '-qp', '24',
        '-maxrate', '10M',
        '-bufsize', '20M',
        '-g', '48',
        '-keyint_min', '48',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        out,
      ];
    }
    // CPU fallback
    return [
      '-y',
      '-i', absPath,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-profile:v', 'main',
      '-level', '4.1',
      '-preset', 'faster',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-maxrate', '10M',
      '-bufsize', '20M',
      '-g', '48',
      '-keyint_min', '48',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      out,
    ];
  };

  return transcodeWithFallback(getArgs, out).then((ok) => (ok ? out : null));
}

function probeVideoSize(absPath: string): { w: number; h: number } | null {
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

function makeVideoHlsFromPlayable(playableMp4Path: string, id: string): Promise<{ hlsDir: string; masterPath: string } | null> {
  const hlsDir = buildHlsDirById(id);
  const streamPath = path.join(hlsDir, 'stream.m3u8');
  const masterPath = path.join(hlsDir, 'master.m3u8');

  const args = [
    '-y',
    '-i', playableMp4Path,
    '-c', 'copy',
    '-hls_time', '4',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', path.join(hlsDir, 'seg_%05d.ts'),
    streamPath,
  ];

  return executeFfmpegAsync(args, 'HLS Packaging').then((ok) => {
    if (!ok) return null;

    const size = probeVideoSize(streamPath) || probeVideoSize(playableMp4Path);
    const res = size ? `${size.w}x${size.h}` : '1920x1080';

    const master = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-STREAM-INF:BANDWIDTH=12000000,AVERAGE-BANDWIDTH=8000000,RESOLUTION=${res},CODECS="avc1.640028,mp4a.40.2"`,
      'stream.m3u8',
      '',
    ].join('\n');
    
    try {
      fs.writeFileSync(masterPath, master);
      return {
        hlsDir,
        masterPath,
      };
    } catch (err: any) {
      console.error(`[Transcoder] Không thể ghi file master.m3u8:`, err.message);
      return null;
    }
  });
}

async function scheduleVideoDerivatives(id: string, absPath: string): Promise<void> {
  try {
    console.log(`[Transcoder] Bắt đầu scheduleVideoDerivatives cho ${id}...`);
    const playable = await makeVideoPlayable(absPath, id);
    console.log(`[Transcoder] Kết quả makeVideoPlayable:`, playable);
    let hls = null;
    if (playable) {
      hls = await makeVideoHlsFromPlayable(playable, id);
      console.log(`[Transcoder] Kết quả makeVideoHlsFromPlayable:`, hls);
    }

    const item = await getAsset(id);
    if (!item) {
      console.error(`[Transcoder] Không tìm thấy item ${id} trong database.`);
      return;
    }

    const playRelPath = playable ? path.relative(LIBRARY_PATH, playable).replaceAll('\\', '/') : null;
    const hlsRelPath = hls?.masterPath ? path.relative(LIBRARY_PATH, hls.masterPath).replaceAll('\\', '/') : null;
    const processingStatus = 'ready';
    const processingFinishedAt = new Date().toISOString();

    await db.query(`
      UPDATE assets 
      SET play_rel_path = COALESCE($1, play_rel_path), 
          hls_rel_path = COALESCE($2, hls_rel_path), 
          processing_status = $3, 
          processing_finished_at = $4 
      WHERE id = $5
    `, [playRelPath, hlsRelPath, processingStatus, processingFinishedAt, id]);

    console.log(`[Transcoder] Đã cập nhật database sang trạng thái ready cho ${id}.`);
  } catch (err) {
    console.error(`[Transcoder] Lỗi nghiêm trọng trong scheduleVideoDerivatives:`, err);
  }
}

export async function saveUploadedFile(file: any, user?: any): Promise<Asset> {
  ensureDirs();
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
  } catch (e: any) {
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

  let ownerId = user?.sub;
  if (!ownerId) {
    const adminRes = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1");
    if (adminRes.rows.length > 0) {
      ownerId = adminRes.rows[0].id;
    } else {
      throw new Error('Unauthorized or no admin user found to associate asset');
    }
  }

  const item: Asset = {
    id,
    originalName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    ownerId,
    groupId: null,
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
    docProjectName: null,
    docProjectNames: [],
    tags: [],
    isDeleted: false,
    deletedAt: null,
    type: file.mimetype?.startsWith('image/') ? 'image' : file.mimetype?.startsWith('video/') ? 'video' : 'file',
  };

  await db.query(`
    INSERT INTO assets (
      id, original_name, mime, size, owner_id, group_id, uploaded_at, taken_at, rel_path,
      play_rel_path, hls_rel_path, processing_status, processing_started_at,
      processing_finished_at, ext, album_name, album_names, doc_project_name,
      doc_project_names, tags, is_deleted, deleted_at, type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
  `, [
    item.id, item.originalName, item.mime, Number(item.size), item.ownerId, item.groupId,
    item.uploadedAt, item.takenAt, item.relPath, item.playRelPath, item.hlsRelPath,
    item.processingStatus, item.processingStartedAt, item.processingFinishedAt,
    item.ext, item.albumName, item.albumNames, item.docProjectName, item.docProjectNames,
    item.tags, item.isDeleted, item.deletedAt, item.type
  ]);

  if (isVideo) scheduleVideoDerivatives(id, absPath);

  return item;
}

export async function listAssets(limit = 200, opts: any = {}): Promise<Asset[]> {
  const { includeTrash = false, onlyTrash = false, owner, ownerId } = opts;
  const targetOwner = ownerId || owner;
  let queryText = 'SELECT * FROM assets';
  const params: any[] = [];
  const clauses: string[] = [];

  if (targetOwner) {
    params.push(targetOwner);
    clauses.push(`owner_id = $${params.length}`);
  }

  if (onlyTrash) {
    clauses.push('is_deleted = true');
  } else if (!includeTrash) {
    clauses.push('is_deleted = false');
  }

  if (clauses.length > 0) {
    queryText += ' WHERE ' + clauses.join(' AND ');
  }

  queryText += ' ORDER BY taken_at DESC LIMIT $' + (params.length + 1);
  params.push(Math.max(1, Math.min(limit, 5000)));

  const res = await db.query(queryText, params);
  return res.rows.map((row: any) => fromDB(row)).filter((x: Asset | null): x is Asset => x !== null);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const res = await db.query('SELECT * FROM assets WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  return fromDB(res.rows[0]);
}

export function getAbsPathFromAsset(asset: Asset): string {
  return path.join(LIBRARY_PATH, asset.relPath);
}

export function getPlayableAbsPathFromAsset(asset: Asset): string | null {
  if (!asset.playRelPath) return null;
  return path.join(LIBRARY_PATH, asset.playRelPath);
}

export function getHlsAbsPathFromAsset(asset: Asset): string | null {
  if (!asset.hlsRelPath) return null;
  return path.join(LIBRARY_PATH, asset.hlsRelPath);
}

export function getHlsDirAbsPathFromAsset(asset: Asset): string | null {
  const hls = getHlsAbsPathFromAsset(asset);
  if (!hls) return null;
  return path.dirname(hls);
}

export async function listAlbums(owner: string): Promise<any[]> {
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(album_names) AS name 
      FROM assets 
      WHERE is_deleted = false AND owner_id = $1
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, [owner]);
  return res.rows;
}

export async function listTags(owner: string): Promise<any[]> {
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(tags) AS name 
      FROM assets 
      WHERE is_deleted = false AND owner_id = $1
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, [owner]);
  return res.rows;
}

export async function setAssetTags(id: string, tags: string[] = []): Promise<{ updated: number }> {
  const cleanTags = tags.map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
  const uniqueTags = [...new Set(cleanTags)];

  const res = await db.query(
    'UPDATE assets SET tags = $1 WHERE id = $2',
    [uniqueTags, id]
  );
  return { updated: res.rowCount || 0 };
}

export async function assignAlbum(ids: string[] = [], albumName = ''): Promise<{ updated: number }> {
  const name = String(albumName || '').trim();
  if (!name || ids.length === 0) return { updated: 0 };

  const client = await db.pool.connect();
  let updated = 0;
  try {
    await client.query('BEGIN');
    
    const res1 = await client.query(`
      UPDATE assets 
      SET album_names = array_append(album_names, $1), 
          album_name = COALESCE(album_name, $1)
      WHERE id = ANY($2) AND NOT ($1 = ANY(album_names)) AND is_deleted = false
    `, [name, ids]);
    
    await client.query(`
      UPDATE assets 
      SET album_name = COALESCE(album_name, $1)
      WHERE id = ANY($2) AND is_deleted = false
    `, [name, ids]);
    
    await client.query('COMMIT');
    updated = res1.rowCount || 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { updated };
}

export async function setAssetAlbums(id: string, albumNames: string[] = []): Promise<{ updated: number }> {
  const names = albumNames.map(x => String(x || '').trim()).filter(Boolean);
  const primaryAlbum = names[0] || null;

  const res = await db.query(
    'UPDATE assets SET album_names = $1, album_name = $2 WHERE id = $3',
    [names, primaryAlbum, id]
  );
  return { updated: res.rowCount || 0 };
}

export async function listDocProjects(owner: string): Promise<any[]> {
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(doc_project_names) AS name 
      FROM assets 
      WHERE is_deleted = false AND type != 'image' AND type != 'video' AND owner_id = $1
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, [owner]);
  return res.rows;
}

export async function assignDocProject(ids: string[] = [], projectName = ''): Promise<{ updated: number }> {
  const name = String(projectName || '').trim();
  if (!name || ids.length === 0) return { updated: 0 };

  const client = await db.pool.connect();
  let updated = 0;
  try {
    await client.query('BEGIN');
    
    const res1 = await client.query(`
      UPDATE assets 
      SET doc_project_names = array_append(doc_project_names, $1), 
          doc_project_name = COALESCE(doc_project_name, $1)
      WHERE id = ANY($2) AND NOT ($1 = ANY(doc_project_names)) AND is_deleted = false AND type != 'image' AND type != 'video'
    `, [name, ids]);
    
    await client.query(`
      UPDATE assets 
      SET doc_project_name = COALESCE(doc_project_name, $1)
      WHERE id = ANY($2) AND is_deleted = false AND type != 'image' AND type != 'video'
    `, [name, ids]);
    
    await client.query('COMMIT');
    updated = res1.rowCount || 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { updated };
}

export async function moveToTrash(ids: string[] = []): Promise<{ updated: number }> {
  if (ids.length === 0) return { updated: 0 };

  const client = await db.pool.connect();
  let updated = 0;
  try {
    await client.query('BEGIN');
    
    const selectRes = await client.query('SELECT * FROM assets WHERE id = ANY($1) AND is_deleted = false', [ids]);
    const assetsToMove = selectRes.rows.map((row: any) => fromDB(row)).filter((x: Asset | null): x is Asset => x !== null);
    
    for (const item of assetsToMove) {
      const oldAbs = path.join(LIBRARY_PATH, item.relPath || '');
      const ext = path.extname(item.originalName || '') || path.extname(item.relPath || '') || '';
      const trashDir = path.join(TRASH_ROOT, new Date().toISOString().slice(0, 10));
      fs.mkdirSync(trashDir, { recursive: true });
      const newAbs = path.join(trashDir, `${item.id}${ext}`);
      
      if (fs.existsSync(oldAbs)) {
        try {
          fs.renameSync(oldAbs, newAbs);
        } catch (e: any) {
          if (e && e.code === 'EXDEV') {
            fs.copyFileSync(oldAbs, newAbs);
            fs.unlinkSync(oldAbs);
          } else {
            throw e;
          }
        }
        const newRelPath = path.relative(LIBRARY_PATH, newAbs).replaceAll('\\', '/');
        
        await client.query(
          'UPDATE assets SET rel_path = $1, is_deleted = true, deleted_at = $2 WHERE id = $3',
          [newRelPath, new Date().toISOString(), item.id]
        );
        updated++;
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { updated };
}

export async function restoreFromTrash(ids: string[] = []): Promise<{ updated: number }> {
  if (ids.length === 0) return { updated: 0 };

  const client = await db.pool.connect();
  let updated = 0;
  try {
    await client.query('BEGIN');
    
    const selectRes = await client.query('SELECT * FROM assets WHERE id = ANY($1) AND is_deleted = true', [ids]);
    const assetsToRestore = selectRes.rows.map((row: any) => fromDB(row)).filter((x: Asset | null): x is Asset => x !== null);
    
    for (const item of assetsToRestore) {
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
        } catch (e: any) {
          if (e && e.code === 'EXDEV') {
            fs.copyFileSync(oldAbs, newAbs);
            fs.unlinkSync(oldAbs);
          } else {
            throw e;
          }
        }
        const newRelPath = path.relative(LIBRARY_PATH, newAbs).replaceAll('\\', '/');
        
        await client.query(
          'UPDATE assets SET rel_path = $1, is_deleted = false, deleted_at = null WHERE id = $2',
          [newRelPath, item.id]
        );
        updated++;
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { updated };
}

export async function purgeDeleted(ids: string[] = []): Promise<{ removed: number }> {
  if (ids.length === 0) return { removed: 0 };

  const client = await db.pool.connect();
  let removed = 0;
  try {
    await client.query('BEGIN');
    
    const selectRes = await client.query('SELECT * FROM assets WHERE id = ANY($1) AND is_deleted = true', [ids]);
    const assetsToPurge = selectRes.rows.map((row: any) => fromDB(row)).filter((x: Asset | null): x is Asset => x !== null);
    
    for (const item of assetsToPurge) {
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
      
      await client.query('DELETE FROM assets WHERE id = $1', [item.id]);
      removed++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { removed };
}

ensureDirs();
