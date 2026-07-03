import fs from 'fs';
import path from 'path';
import * as db from './db';
import { resolveStoragePath } from './assets';

interface StorageCache {
  at: number;
  ttlMs: number;
  value: any;
}

const cache: StorageCache = {
  at: 0,
  ttlMs: (Number(process.env.STORAGE_USAGE_CACHE_SECONDS || 60) || 60) * 1000,
  value: null,
};

function safeStatfs(targetPath: string): fs.StatsFs | null {
  try {
    return fs.statfsSync(targetPath);
  } catch {
    return null;
  }
}

function dirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {}
      }
    }
  }

  return total;
}

export async function getStorageUsage(): Promise<any> {
  const now = Date.now();

  // Đếm số lượng video đang xử lý trực tiếp từ DB trước khi kiểm tra cache
  const procRes = await db.query(
    "SELECT COUNT(*)::int AS count FROM assets WHERE processing_status = 'processing' AND is_deleted = false"
  );
  const processingCount = procRes.rows[0]?.count || 0;

  // Nếu đang có tiến trình xử lý và đã có dữ liệu cache cũ, trả về cache kèm số lượng mới nhất
  // để tránh việc chạy tính toán dung lượng thư mục nặng nề
  if (processingCount > 0 && cache.value) {
    return {
      ...cache.value,
      processingCount,
      updatedAt: cache.value.updatedAt,
      note: 'usage frozen while processing media',
    };
  }

  // Nếu không có tiến trình xử lý, kiểm tra xem cache đã hết hạn chưa
  if (cache.value && now - cache.at < cache.ttlMs) {
    return {
      ...cache.value,
      processingCount, // Đảm bảo luôn cập nhật chính xác số lượng
    };
  }

  const mountPoint = resolveStoragePath(process.env.MEDIA_MOUNT_POINT || '/data');
  const library = resolveStoragePath(process.env.MEDIA_LIBRARY_PATH || '/data/library');
  const derived = resolveStoragePath(process.env.MEDIA_DERIVED_PATH || '/data/library/derived');
  const trash = resolveStoragePath(process.env.MEDIA_TRASH_PATH || '/data/library/trash');
  const originals = path.join(library, 'originals');

  const s = safeStatfs(mountPoint);
  const blockSize = s?.bsize || 0;
  const totalBytes = blockSize * (s?.blocks || 0);
  const freeBytes = blockSize * (s?.bavail || 0);
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const usedPercent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : 0;

  const originalsBytes = dirSizeBytes(originals);
  const derivedBytes = dirSizeBytes(derived);
  const trashBytes = dirSizeBytes(trash);

  const usage = {
    mountPoint,
    totalBytes,
    usedBytes,
    freeBytes,
    usedPercent,
    breakdown: {
      originalsBytes,
      derivedBytes,
      trashBytes,
    },
    processingCount,
    updatedAt: new Date().toISOString(),
  };

  cache.at = now;
  cache.value = usage;
  return usage;
}
