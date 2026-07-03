import { getStorageUsage } from '../../lib/storage';

export async function getStorageUsageStats() {
  return getStorageUsage();
}
