import { setAssetAlbums, setAssetDocProjects } from '../../lib/assets';
import { NotFoundError } from '../../lib/errors';

export async function updateAssetAlbums(assetId: string, albumNames: string[]) {
  const result = await setAssetAlbums(assetId, albumNames);
  if (result.updated === 0) {
    throw new NotFoundError('File not found');
  }
  return result;
}

export async function updateAssetDocProjects(assetId: string, projectNames: string[]) {
  const result = await setAssetDocProjects(assetId, projectNames);
  if (result.updated === 0) {
    throw new NotFoundError('Document not found or invalid format');
  }
  return result;
}
