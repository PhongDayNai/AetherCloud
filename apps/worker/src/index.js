require('dotenv').config();

const concurrency = Number(process.env.WORKER_CONCURRENCY || 2);

console.log('[aethercloud-worker] started');
console.log(`[aethercloud-worker] concurrency=${concurrency}`);
console.log('[aethercloud-worker] queue pipeline scaffold is ready (transcode/exif jobs will be added next).');

setInterval(() => {
  console.log(`[aethercloud-worker] heartbeat ${new Date().toISOString()}`);
}, 60_000);
