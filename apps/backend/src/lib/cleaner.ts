import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import * as db from './db';
import { LIBRARY_PATH, resolveStoragePath } from './assets';

const ORIGINALS_ROOT = path.resolve(LIBRARY_PATH, 'originals');
const TRASH_ROOT = resolveStoragePath(process.env.MEDIA_TRASH_PATH || path.join(LIBRARY_PATH, 'trash'));
const DERIVED_ROOT = path.resolve(LIBRARY_PATH, 'derived');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function walkFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    } catch {}
  }
  return fileList;
}

function cleanEmptyDirs(dir: string): void {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        cleanEmptyDirs(filePath);
      }
    }
    // Đọc lại sau khi đã xóa các thư mục con trống
    const filesAfter = fs.readdirSync(dir);
    if (filesAfter.length === 0 && dir !== ORIGINALS_ROOT && dir !== TRASH_ROOT) {
      fs.rmdirSync(dir);
    }
  } catch {}
}

export async function runOrphanedCleanup(isDryRun = false): Promise<{ scanned: number; removed: number; size: number }> {
  console.log(`[Cleaner] Bắt đầu quét và dọn dẹp tệp tin mồ côi...`);
  if (isDryRun) {
    console.log(`[Cleaner] CHẾ ĐỘ THỬ NGHIỆM (DRY RUN) - Sẽ không có tệp nào thực sự bị xóa.`);
  }

  const client = await db.pool.connect();
  let dbActivePaths = new Set<string>();
  try {
    // Dọn dẹp các asset mồ côi trong database (các asset đính kèm post nhưng post/space đã bị xóa)
    if (!isDryRun) {
      // Chỉ xóa những tệp mồ côi đã được tạo hơn 3 giờ trước để tránh ảnh hưởng đến các phiên upload đang diễn ra
      const delRes = await client.query(`
        DELETE FROM assets 
        WHERE is_library = false 
        AND created_at < NOW() - INTERVAL '3 hours'
        AND id NOT IN (SELECT asset_id FROM post_assets)
      `);
      if (delRes.rowCount && delRes.rowCount > 0) {
        console.log(`[Cleaner] Đã dọn dẹp ${delRes.rowCount} bản ghi asset mồ côi trong database.`);
      }
    }

    const res = await client.query('SELECT rel_path, play_rel_path, hls_rel_path FROM assets');
    for (const row of res.rows) {
      if (row.rel_path) dbActivePaths.add(row.rel_path.replaceAll('\\', '/'));
      if (row.play_rel_path) dbActivePaths.add(row.play_rel_path.replaceAll('\\', '/'));
      if (row.hls_rel_path) dbActivePaths.add(row.hls_rel_path.replaceAll('\\', '/'));
    }
    console.log(`[Cleaner] Đã lấy ${dbActivePaths.size} đường dẫn active tham chiếu từ database.`);
  } catch (err: any) {
    console.error('[Cleaner] Lỗi truy vấn database:', err.message);
    client.release();
    throw err;
  } finally {
    client.release();
  }

  let totalScanned = 0;
  let orphanedCount = 0;
  let spaceReclaimed = 0;

  // 1. Quét originals
  if (fs.existsSync(ORIGINALS_ROOT)) {
    const originalFiles = walkFiles(ORIGINALS_ROOT);
    for (const file of originalFiles) {
      totalScanned++;
      const relPath = path.relative(LIBRARY_PATH, file).replaceAll('\\', '/');
      const baseName = path.basename(file, path.extname(file));
      if (UUID_REGEX.test(baseName)) {
        if (!dbActivePaths.has(relPath)) {
          orphanedCount++;
          try {
            const stat = fs.statSync(file);
            spaceReclaimed += stat.size;
            console.log(`[Mồ côi] [Original] ${relPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
            if (!isDryRun) {
              fs.unlinkSync(file);
            }
          } catch {}
        }
      }
    }
  }

  // 2. Quét trash
  if (fs.existsSync(TRASH_ROOT)) {
    const trashFiles = walkFiles(TRASH_ROOT);
    for (const file of trashFiles) {
      totalScanned++;
      const relPath = path.relative(LIBRARY_PATH, file).replaceAll('\\', '/');
      const baseName = path.basename(file, path.extname(file));
      if (UUID_REGEX.test(baseName)) {
        if (!dbActivePaths.has(relPath)) {
          orphanedCount++;
          try {
            const stat = fs.statSync(file);
            spaceReclaimed += stat.size;
            console.log(`[Mồ côi] [Trash] ${relPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
            if (!isDryRun) {
              fs.unlinkSync(file);
            }
          } catch {}
        }
      }
    }
  }

  // 3. Quét derived/play
  const playDir = path.join(DERIVED_ROOT, 'play');
  if (fs.existsSync(playDir)) {
    const playFiles = walkFiles(playDir);
    for (const file of playFiles) {
      totalScanned++;
      const relPath = path.relative(LIBRARY_PATH, file).replaceAll('\\', '/');
      const baseName = path.basename(file, path.extname(file));
      if (UUID_REGEX.test(baseName)) {
        if (!dbActivePaths.has(relPath)) {
          orphanedCount++;
          try {
            const stat = fs.statSync(file);
            spaceReclaimed += stat.size;
            console.log(`[Mồ côi] [Play-Derived] ${relPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
            if (!isDryRun) {
              fs.unlinkSync(file);
            }
          } catch {}
        }
      }
    }
  }

  // 4. Quét derived/hls
  const hlsDir = path.join(DERIVED_ROOT, 'hls');
  if (fs.existsSync(hlsDir)) {
    try {
      const subdirs = fs.readdirSync(hlsDir);
      for (const subdir of subdirs) {
        const fullPath = path.join(hlsDir, subdir);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && UUID_REGEX.test(subdir)) {
            totalScanned++;
            const relPath = path.relative(LIBRARY_PATH, fullPath).replaceAll('\\', '/');
            if (!dbActivePaths.has(relPath)) {
              let dirSize = 0;
              const hlsFiles = walkFiles(fullPath);
              for (const f of hlsFiles) {
                try {
                  const fStat = fs.statSync(f);
                  dirSize += fStat.size;
                } catch {}
              }
              orphanedCount++;
              spaceReclaimed += dirSize;
              console.log(`[Mồ côi] [HLS-Derived] ${relPath}/ (${(dirSize / 1024 / 1024).toFixed(2)} MB)`);
              if (!isDryRun) {
                fs.rmSync(fullPath, { recursive: true, force: true });
              }
            }
          }
        } catch {}
      }
    } catch {}
  }

  // Xóa các thư mục trống
  if (!isDryRun) {
    cleanEmptyDirs(ORIGINALS_ROOT);
    cleanEmptyDirs(TRASH_ROOT);
  }

  console.log(`[Cleaner] Kết quả dọn dẹp:`);
  console.log(`  - Đã quét: ${totalScanned} tệp/thư mục`);
  console.log(`  - Phát hiện mồ côi: ${orphanedCount}`);
  console.log(`  - Giải phóng: ${(spaceReclaimed / 1024 / 1024).toFixed(2)} MB`);

  return {
    scanned: totalScanned,
    removed: orphanedCount,
    size: spaceReclaimed,
  };
}
