import { listTags, setAssetTags } from '../../lib/assets';
import { isValidUUID, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError, NotFoundError } from '../../lib/errors';

export async function listUserTags(userId: string, groupId: string | null) {
  if (groupId) {
    if (!isValidUUID(groupId)) {
      throw new ValidationError('groupId không đúng định dạng UUID');
    }
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError('Bạn không có quyền truy cập thông tin nhóm này');
    }
  }
  return listTags(userId, groupId);
}

export async function updateAssetTags(assetId: string, tags: string[]) {
  const result = await setAssetTags(assetId, tags);
  if (result.updated === 0) {
    throw new NotFoundError('Asset not found');
  }
  return result;
}
