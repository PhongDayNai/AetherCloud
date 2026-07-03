import * as db from './db';

/**
 * Tiện ích hỗ trợ xác thực dữ liệu chung cho Backend.
 */

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kiểm tra xem một chuỗi có khớp định dạng UUID hợp lệ không.
 */
export function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== 'string') return false;
  return uuidRegex.test(uuid);
}

/**
 * Lọc một danh sách và chỉ trả về các phần tử khớp định dạng UUID.
 */
export function filterValidUUIDs(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: any) => String(x || '').trim())
    .filter(isValidUUID);
}

/**
 * Kiểm tra xem một người dùng có phải thành viên của nhóm không và lấy vai trò của họ.
 * Trả về vai trò ('owner' | 'admin' | 'member') hoặc null nếu không phải thành viên.
 */
export async function getGroupMemberRole(groupId: string | null | undefined, userId: string | null | undefined): Promise<string | null> {
  if (!groupId || !userId) return null;
  const memberRes = await db.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  if (memberRes.rows.length === 0) return null;
  return memberRes.rows[0].role;
}

/**
 * Kiểm tra nhanh xem người dùng có là thành viên nhóm hay không.
 */
export async function isGroupMember(groupId: string | null | undefined, userId: string | null | undefined): Promise<boolean> {
  const role = await getGroupMemberRole(groupId, userId);
  return role !== null;
}
