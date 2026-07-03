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
  isLibrary: boolean;
  type: string;
}

const isDocker = fs.existsSync('/.dockerenv');

export const CATEGORY_EXTENSIONS: Record<string, string[]> = {
  pdf: ['pdf'],
  word: ['doc', 'docx', 'docm', 'dotx', 'odt', 'pages', 'rtf'],
  excel: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'tsv', 'ods', 'numbers'],
  powerpoint: ['ppt', 'pptx', 'pptm', 'ppsx', 'odp'], // .key được xử lý động riêng biệt
  markdown: ['md', 'markdown', 'mdx'],
  text: ['txt', 'log'],
  ebook: ['epub', 'azw', 'azw1', 'azw3', 'azw4', 'azw8', 'kfx', 'tpz', 'mobi', 'prc', 'fb2', 'pdb', 'lrf', 'lrx', 'lit', 'djvu', 'djv', 'cbz', 'cbr', 'cb7', 'cbt', 'cba', 'ibooks', 'xeb'],
  database: ['db', 'db3', 'sqlite', 'sqlite3', 'sqlite2', 'sqlitedb', 'mdb', 'accdb', 'dbf', 'fpt', 'cdx', 'ndf', 'ldf', 'frm', 'ibd', 'myd', 'myi', 'dump', 'ora', 'dbs', 'fdb', 'gdb', 'dbm', 'realm', 'mdbx', 'ldb', 'rdb', 'aof', 'mv.db', 'h2.db', 'duckdb', 'parquet', 'orc', 'feather', 'arrow', 'gpkg', 'sst'],
  archive: ['zip', 'zipx', 'rar', '7z', 'tar', 'tgz', 'tbz', 'tbz2', 'txz', 'tzst', 'tlz', 'tlz4', 'taz', 'gz', 'bz2', 'xz', 'lz', 'lz4', 'lzma', 'zst', 'br', 'Z', 'cpio', 'ar', 'ace', 'arc', 'lzh', 'lha', 'zoo', 'sit', 'sitx'],
  installer: ['apk', 'aab', 'xapk', 'ipa', 'exe', 'msi', 'msix', 'msixbundle', 'appx', 'appxbundle', 'appinstaller', 'pkg', 'mpkg', 'deb', 'rpm', 'snap', 'flatpak', 'appimage', 'run', 'bin', 'jar', 'war', 'ear', 'whl', 'egg', 'crx', 'xpi', 'vsix'],
  'disk-image': ['iso', 'img', 'ima', 'toast', 'nrg', 'mds', 'ccd', 'cue', 'cdi', 'daa', 'uif', 'wim', 'esd', 'dmg', 'vdi', 'vhd', 'vhdx', 'vmdk', 'qcow', 'qcow2', 'ova', 'ovf', 'hdd', 'mdf'], // .cue được giữ ở đây
  font: ['ttf', 'ttc', 'otf', 'otc', 'woff', 'woff2', 'eot', 'fon', 'fnt', 'bdf', 'pcf', 'pfb', 'pfm', 'afm', 'ufo'],
  certificate: ['pem', 'crt', 'cer', 'der', 'csr', 'key', 'pub', 'pk8', 'pkcs8', 'p7b', 'p7c', 'p7s', 'p8', 'p10', 'p12', 'pfx', 'p11', 'jks', 'keystore', 'truststore', 'bks', 'bcfks', 'ppk', 'gpg', 'pgp', 'gpgsig', 'asc', 'sig', 'p7m', 'crl', 'cat', 'mobileprovision', 'spc'],
  design: ['psd', 'psb', 'ai', 'indd', 'indt', 'idml', 'xd', 'eps', 'fig', 'sketch', 'xcf', 'kra', 'svg', 'cdr', 'cmx', 'afdesign', 'afphoto', 'afpub', 'canva', 'clip', 'sai', 'sai2'],
  cad: ['dwg', 'dxf', 'dwt', 'step', 'stp', 'iges', 'igs', 'stl', 'fbx', '3ds', 'max', 'blend', 'glb', 'gltf', 'dae', 'abc', 'usd', 'usda', 'usdc', 'usdz', '3dm', 'skp', 'sldprt', 'sldasm', 'slddrw', 'ipt', 'iam', 'idw', 'catpart', 'catproduct', 'catdrawing', 'prt', 'x_t', 'x_b', 'sat', 'sab', 'ifc', 'rvt', 'rfa', 'scad', 'ply', 'las', 'laz', 'obj'],
  executable: ['dll', 'com', 'scr', 'cpl', 'ocx', 'drv', 'sys', 'mui', 'so', 'out', 'elf', 'ko', 'dylib', 'app', 'bundle', 'o', 'a', 'lib', 'lo', 'la', 'class', 'pyc', 'pyo', 'ni.dll', 'wasm'],
  code: [
    'c', 'cc', 'cp', 'cpp', 'cxx', 'c++', 'h', 'hh', 'hp', 'hpp', 'hxx', 'h++', 'inl', 'ipp', 'tpp', 'cs', 'vb', 'fs', 'fsi', 'fsx', 'java', 'kt', 'kts', 'scala', 'sc', 'groovy', 'gvy', 'gy', 'gsh', 'go', 'rs', 'zig', 'swift', 'm', 'mm', 'dart', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'styl', 'vue', 'svelte', 'astro', 'php', 'php3', 'php4', 'php5', 'phtml', 'py', 'pyw', 'pyi', 'pyx', 'pxd', 'pxi', 'ipynb', 'rb', 'rbw', 'rake', 'pl', 'pm', 't', 'lua', 'r', 'rmd', 'jl', 'hs', 'lhs', 'ml', 'mli', 'elm', 'erl', 'hrl', 'ex', 'exs', 'clj', 'cljs', 'cljc', 'edn', 'lisp', 'lsp', 'el', 'scm', 'ss', 'nim', 'nims', 'cr', 'v', 'vsh', 'd', 'adb', 'ads', 'pas', 'pp', 'lpr', 'f', 'f77', 'f90', 'f95', 'f03', 'f08', 'cob', 'cbl', 'asm', 's', 'S', 'sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'ps1', 'psm1', 'psd1', 'bat', 'cmd', 'awk', 'sed', 'sql', 'psql', 'pgsql', 'graphql', 'gql', 'proto', 'thrift', 'sol', 'move', 'wat', 'pro', 'prolog', 'gd', 'glsl', 'vert', 'frag', 'geom', 'comp', 'tesc', 'tese', 'bicep'
  ],
  config: [
    'json', 'json5', 'jsonc', 'jsonld', 'xml', 'xsd', 'xsl', 'xslt', 'wsdl', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'cnf', 'properties', 'env', 'dockerfile', 'dockerignore', 'containerfile', 'gitignore', 'gitattributes', 'gitmodules', 'editorconfig', 'npmrc', 'yarnrc', 'pnpmfile', 'pnpm-workspace', 'npmignore', 'lock', 'cmake', 'make', 'mk', 'gradle', 'bazel', 'bzl', 'meson', 'ninja', 'tf', 'tfvars', 'hcl', 'jenkinsfile', 'kubeconfig', 'har', 'manifest', 'service', 'target'
  ]
};

export const CONFIG_FILENAMES = [
  'dockerfile', 'containerfile', 'makefile', 'cmakelists.txt',
  '.gitignore', '.gitattributes', '.gitmodules', '.editorconfig',
  '.env', '.env.local', '.env.production', '.env.development', '.env.test',
  'package-lock.json', 'package.json', 'tsconfig.json', 'jsconfig.json',
  'composer.json', 'composer.lock', 'cargo.toml', 'cargo.lock',
  'go.mod', 'go.sum', 'gemfile', 'gemfile.lock', 'podfile', 'podfile.lock',
  'jenkinsfile', 'procfile', 'vagrantfile', 'brewfile', 'tiltfile',
  'taskfile.yml', 'pnpm-workspace.yaml', 'docker-compose.yml', 'docker-compose.yaml',
  'compose.yaml', 'compose.yml', 'kustomization.yaml', 'chart.yaml', 'values.yaml'
];

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
    isLibrary: row.is_library !== undefined ? Boolean(row.is_library) : true,
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
      WHERE id = $5 OR (rel_path = $6 AND processing_status = 'processing')
    `, [playRelPath, hlsRelPath, processingStatus, processingFinishedAt, id, item.relPath]);

    console.log(`[Transcoder] Đã cập nhật database sang trạng thái ready cho ${id}.`);
  } catch (err) {
    console.error(`[Transcoder] Lỗi nghiêm trọng trong scheduleVideoDerivatives:`, err);
  }
}

export async function saveUploadedFile(file: any, user?: any, groupId: string | null = null, isLibrary = true): Promise<Asset> {
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
    groupId,
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
    isLibrary,
    type: file.mimetype?.startsWith('image/') ? 'image' : file.mimetype?.startsWith('video/') ? 'video' : 'file',
  };

  await db.query(`
    INSERT INTO assets (
      id, original_name, mime, size, owner_id, group_id, uploaded_at, taken_at, rel_path,
      play_rel_path, hls_rel_path, processing_status, processing_started_at,
      processing_finished_at, ext, album_name, album_names, doc_project_name,
      doc_project_names, tags, is_deleted, deleted_at, is_library, type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
  `, [
    item.id, item.originalName, item.mime, Number(item.size), item.ownerId, item.groupId,
    item.uploadedAt, item.takenAt, item.relPath, item.playRelPath, item.hlsRelPath,
    item.processingStatus, item.processingStartedAt, item.processingFinishedAt,
    item.ext, item.albumName, item.albumNames, item.docProjectName, item.docProjectNames,
    item.tags, item.isDeleted, item.deletedAt, item.isLibrary, item.type
  ]);

  if (isVideo) scheduleVideoDerivatives(id, absPath);

  return item;
}

export async function listAssets(limit = 200, opts: any = {}): Promise<Asset[]> {
  const { 
    includeTrash = false, 
    onlyTrash = false, 
    owner, 
    ownerId, 
    cursor,
    type,
    subType,
    category,
    album,
    tag,
    docProject,
    includeNonLibrary = false,
    groupId
  } = opts;
  const targetOwner = ownerId || owner;
  let queryText = 'SELECT * FROM assets';
  const params: any[] = [];
  const clauses: string[] = [];

  if (groupId) {
    params.push(groupId);
    clauses.push(`group_id = $${params.length}`);
  } else {
    if (targetOwner) {
      params.push(targetOwner);
      clauses.push(`owner_id = $${params.length} AND group_id IS NULL`);
    }
  }

  if (onlyTrash) {
    clauses.push('is_deleted = true');
  } else if (!includeTrash) {
    clauses.push('is_deleted = false');
  }

  if (!includeNonLibrary) {
    clauses.push('is_library = true');
  }

  if (type) {
    if (type === 'photos') {
      clauses.push(`(type = 'image' OR type = 'video')`);
    } else if (type === 'docs') {
      clauses.push(`type = 'file'`);
    }
  }

  if (subType) {
    if (subType === 'image' || subType === 'video') {
      params.push(subType);
      clauses.push(`type = $${params.length}`);
    }
  }

  if (album) {
    params.push(album);
    clauses.push(`(album_name = $${params.length} OR $${params.length} = ANY(album_names))`);
  }

  if (tag) {
    params.push(tag);
    clauses.push(`$${params.length} = ANY(tags)`);
  }

  if (docProject) {
    params.push(docProject);
    clauses.push(`(doc_project_name = $${params.length} OR $${params.length} = ANY(doc_project_names))`);
  }

  if (category) {
    const cats = category.split(',');
    const orClauses: string[] = [];

    for (const cat of cats) {
      if (cat === 'other') {
        const allKnownExts = Object.values(CATEGORY_EXTENSIONS).flat();
        params.push(allKnownExts);
        const pAllExts = `$${params.length}`;
        
        params.push(CONFIG_FILENAMES.map(f => f.toLowerCase()));
        const pConfigFiles = `$${params.length}`;
        
        orClauses.push(`(
          NOT (LTRIM(LOWER(ext), '.') = ANY(${pAllExts}))
          AND NOT (LOWER(original_name) = ANY(${pConfigFiles}))
        )`);
      } else if (cat === 'powerpoint') {
        const powerpointExts = CATEGORY_EXTENSIONS.powerpoint;
        params.push(powerpointExts);
        const pPowerpointExts = `$${params.length}`;
        
        orClauses.push(`(
          LTRIM(LOWER(ext), '.') = ANY(${pPowerpointExts})
          OR (LTRIM(LOWER(ext), '.') = 'key' AND (size > 102400 OR COALESCE(mime, '') LIKE '%keynote%' OR COALESCE(mime, '') LIKE '%iwork%'))
        )`);
      } else if (cat === 'certificate') {
        const certificateExts = CATEGORY_EXTENSIONS.certificate;
        params.push(certificateExts);
        const pCertificateExts = `$${params.length}`;
        
        orClauses.push(`(
          LTRIM(LOWER(ext), '.') = ANY(${pCertificateExts})
          OR (LTRIM(LOWER(ext), '.') = 'key' AND (size <= 102400 AND (COALESCE(mime, '') NOT LIKE '%keynote%' AND COALESCE(mime, '') NOT LIKE '%iwork%')))
        )`);
      } else if (cat === 'config') {
        const configExts = CATEGORY_EXTENSIONS.config;
        params.push(configExts);
        const pConfigExts = `$${params.length}`;
        
        params.push(CONFIG_FILENAMES.map(f => f.toLowerCase()));
        const pConfigFiles = `$${params.length}`;
        
        orClauses.push(`(
          LOWER(original_name) = ANY(${pConfigFiles})
          OR LTRIM(LOWER(ext), '.') = ANY(${pConfigExts})
        )`);
      } else {
        const exts = CATEGORY_EXTENSIONS[cat] || [];
        params.push(exts);
        const pExts = `$${params.length}`;
        orClauses.push(`LTRIM(LOWER(ext), '.') = ANY(${pExts})`);
      }
    }

    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(' OR ')})`);
    }
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (decoded.takenAt && decoded.id) {
        params.push(decoded.takenAt);
        const pTakenAt = `$${params.length}`;
        params.push(decoded.id);
        const pId = `$${params.length}`;
        clauses.push(`(taken_at < ${pTakenAt} OR (taken_at = ${pTakenAt} AND id < ${pId}))`);
      }
    } catch (e) {
      console.error('Failed to parse cursor in listAssets:', e);
    }
  }

  if (clauses.length > 0) {
    queryText += ' WHERE ' + clauses.join(' AND ');
  }

  queryText += ' ORDER BY taken_at DESC, id DESC LIMIT $' + (params.length + 1);
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

export async function listAlbums(owner: string, groupId: string | null = null): Promise<any[]> {
  const whereClause = groupId ? 'group_id = $2' : 'owner_id = $1 AND group_id IS NULL';
  const params = groupId ? [owner, groupId] : [owner];
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(album_names) AS name 
      FROM assets 
      WHERE is_deleted = false AND ${whereClause}
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, params);
  return res.rows;
}

export async function listTags(owner: string, groupId: string | null = null): Promise<any[]> {
  const whereClause = groupId ? 'group_id = $2' : 'owner_id = $1 AND group_id IS NULL';
  const params = groupId ? [owner, groupId] : [owner];
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(tags) AS name 
      FROM assets 
      WHERE is_deleted = false AND ${whereClause}
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, params);
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

export async function listDocProjects(owner: string, groupId: string | null = null): Promise<any[]> {
  const whereClause = groupId ? 'group_id = $2' : 'owner_id = $1 AND group_id IS NULL';
  const params = groupId ? [owner, groupId] : [owner];
  const res = await db.query(`
    SELECT name, COUNT(*)::int AS count 
    FROM (
      SELECT unnest(doc_project_names) AS name 
      FROM assets 
      WHERE is_deleted = false AND type != 'image' AND type != 'video' AND ${whereClause}
    ) sub 
    GROUP BY name 
    ORDER BY name
  `, params);
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

export async function setAssetDocProjects(id: string, projectNames: string[] = []): Promise<{ updated: number }> {
  const names = projectNames.map(x => String(x || '').trim()).filter(Boolean);
  const primaryProject = names[0] || null;

  const res = await db.query(
    'UPDATE assets SET doc_project_names = $1, doc_project_name = $2 WHERE id = $3 AND type != \'image\' AND type != \'video\'',
    [names, primaryProject, id]
  );
  return { updated: res.rowCount || 0 };
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
      // 1. Kiểm tra xem còn bản ghi asset nào khác dùng chung file gốc vật lý không
      const countRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM assets WHERE rel_path = $1 AND id != $2',
        [item.relPath, item.id]
      );
      if (countRes.rows[0].count === 0) {
        const abs = path.join(LIBRARY_PATH, item.relPath || '');
        try {
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        } catch {}
      }
      
      // 2. Kiểm tra xem còn bản ghi asset nào khác dùng chung video playable không
      if (item.playRelPath) {
        const playCountRes = await client.query(
          'SELECT COUNT(*)::int AS count FROM assets WHERE play_rel_path = $1 AND id != $2',
          [item.playRelPath, item.id]
        );
        if (playCountRes.rows[0].count === 0) {
          const playAbs = path.join(LIBRARY_PATH, item.playRelPath);
          try { if (fs.existsSync(playAbs)) fs.unlinkSync(playAbs); } catch {}
        }
      }
      
      // 3. Kiểm tra xem còn bản ghi asset nào khác dùng chung thư mục HLS không
      if (item.hlsRelPath) {
        const hlsCountRes = await client.query(
          'SELECT COUNT(*)::int AS count FROM assets WHERE hls_rel_path = $1 AND id != $2',
          [item.hlsRelPath, item.id]
        );
        if (hlsCountRes.rows[0].count === 0) {
          const hlsAbs = path.join(LIBRARY_PATH, item.hlsRelPath);
          try {
            const hlsDir = path.dirname(hlsAbs);
            if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true, force: true });
          } catch {}
        }
      }
      
      await client.query('DELETE FROM assets WHERE id = $1', [item.id]);
      removed++;
    }
    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { removed };
}

export async function getUnifiedStats(ownerId: string, storage: any, groupId: string | null = null): Promise<any> {
  // 1. Chạy SQL đếm số lượng tệp theo loại
  const whereClause = groupId ? 'group_id = $2' : 'owner_id = $1 AND group_id IS NULL';
  const queryParams = groupId ? [ownerId, groupId] : [ownerId];

  const countRes = await db.query(`
    SELECT 
      COUNT(CASE WHEN is_library = true AND is_deleted = false AND (type = 'image' OR type = 'video') THEN 1 END)::int AS photos_count,
      COUNT(CASE WHEN is_library = true AND is_deleted = false AND type = 'image' THEN 1 END)::int AS images_count,
      COUNT(CASE WHEN is_library = true AND is_deleted = false AND type = 'video' THEN 1 END)::int AS videos_count,
      COUNT(CASE WHEN is_library = true AND is_deleted = false AND type = 'file' THEN 1 END)::int AS docs_count,
      COUNT(CASE WHEN is_library = true AND is_deleted = true THEN 1 END)::int AS trash_count
    FROM assets
    WHERE ${whereClause}
  `, queryParams);
  
  const counts = {
    photosCount: countRes.rows[0]?.photos_count || 0,
    imagesCount: countRes.rows[0]?.images_count || 0,
    videosCount: countRes.rows[0]?.videos_count || 0,
    docsCount: countRes.rows[0]?.docs_count || 0,
    trashCount: countRes.rows[0]?.trash_count || 0,
  };

  // 2. Chạy SQL CTE đếm chi tiết theo category
  const configFilenamesLower = CONFIG_FILENAMES.map(f => f.toLowerCase());
  const whereClauseCat = groupId ? 'group_id = $20' : 'owner_id = $1 AND group_id IS NULL';
  const queryParamsCat = [
    ownerId,
    configFilenamesLower,
    CATEGORY_EXTENSIONS.config,
    CATEGORY_EXTENSIONS.word,
    CATEGORY_EXTENSIONS.excel,
    CATEGORY_EXTENSIONS.powerpoint,
    CATEGORY_EXTENSIONS.markdown,
    CATEGORY_EXTENSIONS.text,
    CATEGORY_EXTENSIONS.ebook,
    CATEGORY_EXTENSIONS.database,
    CATEGORY_EXTENSIONS.archive,
    CATEGORY_EXTENSIONS.installer,
    CATEGORY_EXTENSIONS['disk-image'],
    CATEGORY_EXTENSIONS.font,
    CATEGORY_EXTENSIONS.certificate,
    CATEGORY_EXTENSIONS.design,
    CATEGORY_EXTENSIONS.cad,
    CATEGORY_EXTENSIONS.executable,
    CATEGORY_EXTENSIONS.code
  ];
  if (groupId) {
    queryParamsCat.push(groupId);
  }

  const catRes = await db.query(`
    WITH classified AS (
      SELECT 
        id,
        CASE 
          WHEN LOWER(original_name) = ANY($2) OR LTRIM(LOWER(ext), '.') = ANY($3) THEN 'config'
          WHEN LTRIM(LOWER(ext), '.') = 'pdf' THEN 'pdf'
          WHEN LTRIM(LOWER(ext), '.') = ANY($4) THEN 'word'
          WHEN LTRIM(LOWER(ext), '.') = ANY($5) THEN 'excel'
          WHEN LTRIM(LOWER(ext), '.') = ANY($6) OR (LTRIM(LOWER(ext), '.') = 'key' AND (size > 102400 OR COALESCE(mime, '') LIKE '%keynote%' OR COALESCE(mime, '') LIKE '%iwork%')) THEN 'powerpoint'
          WHEN LTRIM(LOWER(ext), '.') = ANY($7) THEN 'markdown'
          WHEN LTRIM(LOWER(ext), '.') = ANY($8) THEN 'text'
          WHEN LTRIM(LOWER(ext), '.') = ANY($9) THEN 'ebook'
          WHEN LTRIM(LOWER(ext), '.') = ANY($10) THEN 'database'
          WHEN LTRIM(LOWER(ext), '.') = ANY($11) THEN 'archive'
          WHEN LTRIM(LOWER(ext), '.') = ANY($12) THEN 'installer'
          WHEN LTRIM(LOWER(ext), '.') = ANY($13) THEN 'disk-image'
          WHEN LTRIM(LOWER(ext), '.') = ANY($14) THEN 'font'
          WHEN LTRIM(LOWER(ext), '.') = ANY($15) OR (LTRIM(LOWER(ext), '.') = 'key' AND size <= 102400 AND (COALESCE(mime, '') NOT LIKE '%keynote%' AND COALESCE(mime, '') NOT LIKE '%iwork%')) THEN 'certificate'
          WHEN LTRIM(LOWER(ext), '.') = ANY($16) THEN 'design'
          WHEN LTRIM(LOWER(ext), '.') = ANY($17) THEN 'cad'
          WHEN LTRIM(LOWER(ext), '.') = ANY($18) THEN 'executable'
          WHEN LTRIM(LOWER(ext), '.') = ANY($19) THEN 'code'
          ELSE 'other'
        END AS cat
      FROM assets
      WHERE ${whereClauseCat} AND is_library = true AND is_deleted = false AND type = 'file'
    )
    SELECT cat, COUNT(*)::int AS count 
    FROM classified 
    GROUP BY cat
  `, queryParamsCat);

  const docCategoryCounts: Record<string, number> = {};
  for (const key of Object.keys(CATEGORY_EXTENSIONS).concat('other')) {
    docCategoryCounts[key] = 0;
  }
  for (const row of catRes.rows) {
    docCategoryCounts[row.cat] = row.count;
  }

  // 3. Lấy tags, albums, docProjects
  const [tags, albums, docProjects] = await Promise.all([
    listTags(ownerId, groupId),
    listAlbums(ownerId, groupId),
    listDocProjects(ownerId, groupId)
  ]);

  // 4. Lấy 50 ảnh/video mới nhất
  const recentPhotos = await listAssets(50, {
    ownerId: groupId ? undefined : ownerId,
    groupId: groupId || undefined,
    type: 'photos',
    includeTrash: false
  });

  // 5. Lấy 15 tài liệu mới nhất mỗi category hoạt động
  const recentDocs: Record<string, Asset[]> = {};
  for (const key of Object.keys(CATEGORY_EXTENSIONS).concat('other')) {
    recentDocs[key] = [];
  }
  const activeCategories = Object.keys(docCategoryCounts).filter(cat => docCategoryCounts[cat] > 0);
  
  await Promise.all(activeCategories.map(async (cat) => {
    recentDocs[cat] = await listAssets(15, {
      ownerId: groupId ? undefined : ownerId,
      groupId: groupId || undefined,
      category: cat,
      includeTrash: false
    });
  }));

  return {
    counts,
    storage,
    docCategoryCounts,
    tags,
    albums,
    docProjects,
    recentPhotos,
    recentDocs
  };
}

ensureDirs();
