import crypto from 'crypto';
import { saveUploadedFile, Asset } from '../../lib/assets';
import { isValidUUID, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function initUploadChunk(
  fileName: string,
  mime: string,
  totalSize: number,
  lastModified: number | null,
  groupId: string | null,
  saveToPersonal: boolean,
  userId: string
) {
  if (!fileName || !mime) {
    throw new ValidationError('fileName and mime are required');
  }

  if (groupId) {
    if (!isValidUUID(groupId)) {
      throw new ValidationError('groupId is not in valid UUID format');
    }
    if (!(await isGroupMember(groupId, userId))) {
      throw new ForbiddenError('You do not have permission to upload files to this group');
    }
  }

  const uploadId = crypto.randomUUID();
  return { uploadId };
}

export async function completeUploadChunk(
  fileData: { path: string; originalname: string; mimetype: string; size: number; lastModified: number | null },
  groupId: string | null,
  saveToPersonal: boolean,
  user: any
) {
  if (groupId) {
    if (!(await isGroupMember(groupId, user.sub))) {
      throw new ForbiddenError('You are no longer a member of this group');
    }
  }

  let saved: Asset;
  if (groupId) {
    saved = await saveUploadedFile(fileData, user, groupId, true);
    if (saveToPersonal) {
      await saveUploadedFile(fileData, user, null, true);
    }
  } else {
    saved = await saveUploadedFile(fileData, user, null, true);
  }
  return saved;
}

export async function uploadSmallFiles(
  files: any[],
  lastModified: number | null,
  groupId: string | null,
  saveToPersonal: boolean,
  user: any
) {
  if (groupId) {
    if (!isValidUUID(groupId)) {
      throw new ValidationError('groupId is not in valid UUID format');
    }
    if (!(await isGroupMember(groupId, user.sub))) {
      throw new ForbiddenError('You do not have permission to upload files to this group');
    }
  }

  const saved: Asset[] = [];
  for (const f of files) {
    const fileData = { ...f, lastModified };
    if (groupId) {
      const savedAsset = await saveUploadedFile(fileData, user, groupId, true);
      saved.push(savedAsset);

      if (saveToPersonal) {
        await saveUploadedFile(fileData, user, null, true);
      }
    } else {
      const savedAsset = await saveUploadedFile(fileData, user, null, true);
      saved.push(savedAsset);
    }
  }
  return saved;
}
