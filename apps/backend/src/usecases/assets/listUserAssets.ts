import { listAssets } from '../../lib/assets';
import { isValidUUID, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function listUserAssets(userId: string, limit: number, options: {
  includeTrash: boolean;
  onlyTrash: boolean;
  cursor?: string;
  type?: string;
  subType?: string;
  category?: string;
  album?: string;
  tag?: string;
  docProject?: string;
  groupId?: string;
}) {
  if (options.groupId) {
    if (!isValidUUID(options.groupId)) {
      throw new ValidationError('groupId is not in valid UUID format');
    }
    if (!(await isGroupMember(options.groupId, userId))) {
      throw new ForbiddenError('You do not have permission to access files in this group');
    }
  }

  const items = await listAssets(limit, {
    includeTrash: options.includeTrash,
    onlyTrash: options.onlyTrash,
    owner: userId,
    cursor: options.cursor,
    type: options.type,
    subType: options.subType,
    category: options.category,
    album: options.album,
    tag: options.tag,
    docProject: options.docProject,
    groupId: options.groupId
  });

  let nextCursor: string | null = null;
  if (items.length > 0 && items.length === limit) {
    const lastItem = items[items.length - 1];
    const cursorObj = { takenAt: lastItem.takenAt, id: lastItem.id };
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
  }

  return { items, nextCursor };
}
