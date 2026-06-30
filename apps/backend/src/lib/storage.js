const fs = require('fs');
const path = require('path');
const { listAssets } = require('./assets');

const cache = {
  at: 0,
  ttlMs: (Number(process.env.STORAGE_USAGE_CACHE_SECONDS || 60) || 60) * 1000,
  value: null,
};

function safeStatfs(targetPath) {
  try {
    return fs.statfsSync(targetPath);
  } catch {
    return null;
  }
}

function dirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
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

async function getStorageUsage() {
  const now = Date.now();
  if (cache.value && now - cache.at < cache.ttlMs) return cache.value;

  const mountPoint = process.env.MEDIA_MOUNT_POINT || '/data';
  const library = process.env.MEDIA_LIBRARY_PATH || '/data/library';
  const derived = process.env.MEDIA_DERIVED_PATH || '/data/library/derived';
  const trash = process.env.MEDIA_TRASH_PATH || '/data/library/trash';
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

  const assets = await listAssets(5000, { includeTrash: true });
  const processingCount = assets.filter((x) => x.processingStatus === 'processing' && !x.isDeleted).length;

  if (processingCount > 0 && cache.value) {
    return {
      ...cache.value,
      processingCount,
      updatedAt: cache.value.updatedAt,
      note: 'usage frozen while processing media',
    };
  }

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

module.exports = { getStorageUsage };
