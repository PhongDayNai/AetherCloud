import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as db from '../lib/db';
import { requireAuth } from '../middleware/requireAuth';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../lib/utils';

const router = express.Router();

// Middleware kiểm tra quyền thành viên nhóm
export async function requireGroupMember(req: Request, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
  if (!groupId) {
    return res.status(400).json({ message: 'Thiếu ID nhóm (groupId)' });
  }

  // Xác thực định dạng UUID của groupId đầu vào để chặn đứng lỗi syntax của DB
  if (!isValidUUID(groupId)) {
    return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const role = await getGroupMemberRole(groupId, req.user.sub);
    if (!role) {
      return res.status(403).json({ message: 'Bạn không phải là thành viên của nhóm này' });
    }
    req.groupRole = role; // Lưu vai trò để dùng ở các handler sau
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// 1. GET danh sách nhóm của user hiện tại
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.owner_id, g.created_at, gm.role 
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user?.sub]
    );
    return res.json({ ok: true, groups: result.rows });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 1b. GET chi tiết nhóm (yêu cầu là thành viên)
router.get('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const result = await db.query(
      `SELECT id, name, owner_id, created_at 
       FROM groups 
       WHERE id = $1`,
      [groupId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhóm này' });
    }
    return res.json({ ok: true, group: { ...result.rows[0], role: req.groupRole } });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST tạo nhóm mới
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Tên nhóm không được để trống' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = crypto.randomUUID();
    
    // Tạo nhóm
    await client.query(
      'INSERT INTO groups (id, name, owner_id) VALUES ($1, $2, $3)',
      [groupId, name.trim(), req.user?.sub]
    );

    // Thêm owner vào danh sách thành viên nhóm
    await client.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, req.user?.sub, 'owner']
    );

    // Tự động tạo một không gian thảo luận chung mặc định cho nhóm mới
    const defaultSpaceId = crypto.randomUUID();
    await client.query(
      `INSERT INTO spaces (id, name, description, type, owner_id, group_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [defaultSpaceId, 'Chung', 'Không gian thảo luận chung của nhóm', 'journal', req.user?.sub, groupId]
    );

    await client.query('COMMIT');
    return res.json({
      ok: true,
      group: {
        id: groupId,
        name: name.trim(),
        owner_id: req.user?.sub,
        role: 'owner'
      }
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// 3. GET danh sách thành viên trong nhóm
router.get('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const result = await db.query(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.name, u.email 
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY 
         CASE gm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           ELSE 3 
         END, 
         gm.joined_at ASC`,
      [groupId]
    );
    return res.json({ ok: true, members: result.rows });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. POST thêm thành viên vào nhóm qua email
router.post('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { email, role = 'member' } = req.body || {};

  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Email thành viên không được để trống' });
  }

  // Ràng buộc bảo mật vai trò khi thêm
  if (role === 'owner') {
    return res.status(400).json({ message: 'Không thể thêm trực tiếp thành viên với vai trò chủ sở hữu' });
  }
  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ message: 'Vai trò không hợp lệ (admin hoặc member)' });
  }

  // Chỉ owner hoặc admin mới được add thêm thành viên
  if (req.groupRole !== 'owner' && req.groupRole !== 'admin') {
    return res.status(403).json({ message: 'Chỉ chủ sở hữu hoặc quản trị viên mới được thêm thành viên' });
  }

  // Chỉ owner mới được thêm vai trò admin
  if (role === 'admin' && req.groupRole !== 'owner') {
    return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm mới có quyền chỉ định quản trị viên mới' });
  }

  try {
    // Tìm user theo email (chuẩn hóa chữ thường)
    const userRes = await db.query('SELECT id FROM users WHERE email = $1 AND is_active = true LIMIT 1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng hoạt động với email này' });
    }
    const targetUserId = userRes.rows[0].id;

    // Kiểm tra xem đã là thành viên chưa
    if (await isGroupMember(groupId, targetUserId)) {
      return res.status(400).json({ message: 'Người dùng này đã là thành viên của nhóm' });
    }

    // Thêm thành viên
    await db.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, targetUserId, role]
    );

    return res.json({ ok: true, message: 'Thêm thành viên thành công' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. PUT cập nhật vai trò thành viên
router.put('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  const { role } = req.body || {};

  if (!role || (role !== 'admin' && role !== 'member')) {
    return res.status(400).json({ message: 'Vai trò cập nhật không hợp lệ (admin hoặc member)' });
  }

  // Chỉ owner mới có quyền thay đổi vai trò
  if (req.groupRole !== 'owner') {
    return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm mới có quyền thay đổi vai trò thành viên' });
  }

  try {
    // Không thể tự đổi vai trò của owner
    const targetRole = await getGroupMemberRole(groupId, userId);
    if (!targetRole) {
      return res.status(404).json({ message: 'Không tìm thấy thành viên này trong nhóm' });
    }
    if (targetRole === 'owner') {
      return res.status(400).json({ message: 'Không thể thay đổi vai trò của chủ sở hữu nhóm' });
    }

    await db.query(
      'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
      [role, groupId, userId]
    );

    return res.json({ ok: true, message: 'Cập nhật vai trò thành công' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5b. POST nhượng quyền sở hữu nhóm (Transfer Group Ownership)
router.post('/:groupId/owner', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { targetUserId } = req.body || {};

  if (!targetUserId) {
    return res.status(400).json({ message: 'targetUserId là bắt buộc' });
  }

  // Chỉ owner nhóm hiện tại mới được chuyển nhượng quyền sở hữu
  if (req.groupRole !== 'owner') {
    return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm hiện tại mới có quyền chuyển nhượng nhóm' });
  }

  if (targetUserId === req.user?.sub) {
    return res.status(400).json({ message: 'Bạn đã là chủ sở hữu của nhóm này' });
  }

  // Xác minh người nhận chuyển nhượng có phải thành viên nhóm không (Đưa ra ngoài transaction)
  try {
    if (!(await isGroupMember(groupId, targetUserId))) {
      return res.status(400).json({ message: 'Người nhận chuyển nhượng phải là thành viên của nhóm' });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cập nhật owner_id trong bảng groups
    await client.query(
      'UPDATE groups SET owner_id = $1 WHERE id = $2',
      [targetUserId, groupId]
    );

    // 2. Nâng cấp người nhận thành 'owner' trong group_members
    await client.query(
      "UPDATE group_members SET role = 'owner' WHERE group_id = $1 AND user_id = $2",
      [groupId, targetUserId]
    );

    // 3. Hạ cấp owner cũ (user hiện tại) xuống thành 'admin'
    await client.query(
      "UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2",
      [groupId, req.user?.sub]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Chuyển nhượng quyền sở hữu nhóm thành công. Vai trò mới của bạn là Quản trị viên.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// 6. DELETE xóa thành viên hoặc tự rời nhóm
router.delete('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;

  try {
    // Lấy thông tin thành viên cần xóa
    const targetRole = await getGroupMemberRole(groupId, userId);
    if (!targetRole) {
      return res.status(404).json({ message: 'Không tìm thấy thành viên này trong nhóm' });
    }

    // Trường hợp 1: Tự rời nhóm
    if (userId === req.user?.sub) {
      if (targetRole === 'owner') {
        return res.status(400).json({ message: 'Chủ sở hữu không thể tự rời nhóm. Hãy chuyển quyền sở hữu hoặc xóa nhóm.' });
      }
      await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
      return res.json({ ok: true, message: 'Bạn đã rời khỏi nhóm thành công' });
    }

    // Trường hợp 2: Trục xuất thành viên khác
    // Chỉ owner hoặc admin mới được trục xuất thành viên
    if (req.groupRole !== 'owner' && req.groupRole !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền trục xuất thành viên' });
    }
    // Admin không thể trục xuất Admin khác hoặc Owner
    if (req.groupRole === 'admin' && (targetRole === 'admin' || targetRole === 'owner')) {
      return res.status(403).json({ message: 'Quản trị viên không thể trục xuất quản trị viên khác hoặc chủ sở hữu' });
    }
    if (targetRole === 'owner') {
      return res.status(403).json({ message: 'Không thể trục xuất chủ sở hữu nhóm' });
    }

    await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
    return res.json({ ok: true, message: 'Đã trục xuất thành viên thành công' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. DELETE xóa nhóm (chỉ Owner nhóm mới được xóa)
router.delete('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  if (req.groupRole !== 'owner') {
    return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm mới có quyền xóa nhóm' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Xóa tất cả assets thuộc nhóm (sau đó cleaner sẽ dọn dẹp file vật lý mồ côi)
    await client.query('DELETE FROM assets WHERE group_id = $1', [groupId]);

    // Xóa nhóm (sẽ tự động CASCADE xóa group_members và spaces của nhóm)
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Đã xóa nhóm thành công' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

export default router;
