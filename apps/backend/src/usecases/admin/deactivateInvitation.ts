import * as db from '../../lib/db';
import { isValidUUID } from '../../lib/utils';
import { ValidationError, NotFoundError } from '../../lib/errors';

export async function deactivateInvitation(invitationId: string) {
  if (!isValidUUID(invitationId)) {
    throw new ValidationError('id không đúng định dạng UUID');
  }

  const result = await db.query(
    'UPDATE user_invitations SET is_active = false WHERE id = $1',
    [invitationId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Không tìm thấy mã mời');
  }
}
