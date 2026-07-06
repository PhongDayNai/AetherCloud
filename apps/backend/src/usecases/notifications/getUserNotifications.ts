import * as db from '../../lib/db';

export async function getUserNotifications(
  userId: string, 
  isRead?: boolean, 
  limit: number = 20, 
  offset: number = 0
) {
  let queryText = `
    SELECT id, user_id, title, content, type, is_read, created_at, metadata
    FROM notifications
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (isRead !== undefined) {
    queryText += ` AND is_read = $${paramIndex}`;
    params.push(isRead);
    paramIndex++;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit);
  params.push(offset);

  const res = await db.query(queryText, params);
  const rows = res.rows;

  // Lọc ra các thông báo mời nhóm để kiểm tra trạng thái thực tế
  const inviteRows = rows.filter(r => r.type === 'group_invite' && r.metadata);
  if (inviteRows.length > 0) {
    try {
      // Lấy danh sách các group_id mà user này đang là thành viên
      const memberGroupsRes = await db.query(
        'SELECT group_id FROM group_members WHERE user_id = $1',
        [userId]
      );
      const joinedGroupIds = new Set(memberGroupsRes.rows.map(row => row.group_id));

      for (const r of rows) {
        if (r.type === 'group_invite' && r.metadata) {
          const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
          if (meta && meta.groupId) {
            let actualStatus: string | null = null;
            const expiresAt = meta.expiresAt ? new Date(meta.expiresAt) : null;
            const isExpired = expiresAt ? expiresAt < new Date() : false;
            
            if (joinedGroupIds.has(meta.groupId) && !isExpired) {
              actualStatus = 'accepted';
            }

            // Chỉ tự động cập nhật nếu trạng thái hiện tại trong metadata chưa được xác định (null/undefined/rỗng)
            const currentStatus = meta.status;
            const hasNoStatus = currentStatus === undefined || currentStatus === null || currentStatus === '';

            if (actualStatus && hasNoStatus && currentStatus !== actualStatus) {
              meta.status = actualStatus;
              r.metadata = meta;

              // Đồng bộ ngầm xuống Database
              await db.query(
                `UPDATE notifications 
                 SET is_read = true, 
                     metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', $1) 
                 WHERE id = $2`,
                [`"${actualStatus}"`, r.id]
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to auto-resolve notification invite status:', e);
    }
  }

  return rows;
}
