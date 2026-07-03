import crypto from 'crypto';
import * as db from '../../lib/db';
import { ValidationError } from '../../lib/errors';

export async function createGroup(name: string, ownerId: string) {
  if (!name || !name.trim()) {
    throw new ValidationError('Tên nhóm không được để trống');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = crypto.randomUUID();
    
    // Tạo nhóm
    await client.query(
      'INSERT INTO groups (id, name, owner_id) VALUES ($1, $2, $3)',
      [groupId, name.trim(), ownerId]
    );

    // Thêm owner vào danh sách thành viên nhóm
    await client.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, ownerId, 'owner']
    );

    // Tự động tạo một không gian thảo luận chung mặc định cho nhóm mới
    const defaultSpaceId = crypto.randomUUID();
    await client.query(
      `INSERT INTO spaces (id, name, description, type, owner_id, group_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [defaultSpaceId, 'Chung', 'Không gian thảo luận chung của nhóm', 'journal', ownerId, groupId]
    );

    await client.query('COMMIT');
    return {
      id: groupId,
      name: name.trim(),
      owner_id: ownerId,
      role: 'owner'
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
