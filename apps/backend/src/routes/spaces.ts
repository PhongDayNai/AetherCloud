import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { requireAuth } from '../middleware/requireAuth';
import { DomainError } from '../lib/errors';
import * as spacesUsecase from '../usecases/spaces';

const router = express.Router();
const tempDir = '/tmp/aethercloud-upload-spaces';
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  dest: tempDir,
  limits: {
    files: 10,
    fileSize: 100 * 1024 * 1024, // 100MB cho upload trực tiếp vào Space
  },
});

// 1. GET danh sách không gian con
router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined;
  const includeTrash = String(req.query.includeTrash || 'false') === 'true';
  const onlyTrash = String(req.query.onlyTrash || 'false') === 'true';

  try {
    const spaces = await spacesUsecase.listSpaces(req.user.sub, groupId, includeTrash, onlyTrash);
    return res.json({ ok: true, spaces });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST tạo mới không gian con
router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { name, description, type, groupId } = req.body || {};

  try {
    const space = await spacesUsecase.createSpace(name, description, type, groupId, req.user.sub);
    return res.json({ ok: true, space });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2b. PUT cập nhật thông tin không gian con
router.put('/:spaceId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;
  const { name, description, type } = req.body || {};

  try {
    const space = await spacesUsecase.updateSpace(spaceId, name, description, type, req.user.sub);
    return res.json({ ok: true, space });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2c. DELETE đưa không gian con vào thùng rác (Soft Delete)
router.delete('/:spaceId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;

  try {
    await spacesUsecase.trashSpace(spaceId, req.user.sub);
    return res.json({ ok: true, message: 'Đã đưa không gian con vào thùng rác thành công' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2d. POST khôi phục không gian con từ thùng rác
router.post('/:spaceId/restore', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;

  try {
    await spacesUsecase.restoreSpace(spaceId, req.user.sub);
    return res.json({ ok: true, message: 'Khôi phục không gian con thành công' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2e. DELETE xóa vĩnh viễn không gian con (Purge)
router.delete('/:spaceId/purge', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;

  try {
    await spacesUsecase.purgeSpace(spaceId, req.user.sub);
    return res.json({ ok: true, message: 'Đã xóa vĩnh viễn không gian con thành công. Các tệp đính kèm mồ côi sẽ tự động được dọn dẹp.' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 3. GET danh sách bài đăng thuộc không gian con
router.get('/:spaceId/posts', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;

  try {
    const posts = await spacesUsecase.getSpacePosts(spaceId, req.user.sub);
    return res.json({ ok: true, posts });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 4. POST tạo bài viết mới trong không gian con (hỗ trợ upload trực tiếp hoặc đính kèm id cũ)
router.post('/:spaceId/posts', requireAuth, upload.array('files', 10), async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { spaceId } = req.params;
  const { caption, saveToPersonal, lastModifieds } = req.body || {};
  const isSaveToPersonal = String(saveToPersonal) === 'true';

  let lastModifiedsArray: any[] = [];
  if (lastModifieds) {
    try {
      lastModifiedsArray = JSON.parse(lastModifieds);
    } catch {
      // Ignore parse error
    }
  }

  let assetIdsInput = req.body.assetIds || req.body.asset_ids || [];
  if (typeof assetIdsInput === 'string') {
    try {
      assetIdsInput = JSON.parse(assetIdsInput);
    } catch {
      assetIdsInput = assetIdsInput.split(',').map((x: string) => x.trim()).filter(Boolean);
    }
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const cleanFiles = files.map(f => ({
    path: f.path,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size
  }));

  try {
    const result = await spacesUsecase.createSpacePost(
      spaceId,
      caption,
      isSaveToPersonal,
      lastModifiedsArray,
      assetIdsInput,
      cleanFiles,
      req.user
    );
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

export default router;
