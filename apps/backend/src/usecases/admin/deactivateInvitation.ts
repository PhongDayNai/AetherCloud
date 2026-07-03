import * as db from '../../lib/db';
import { isValidUUID } from '../../lib/utils';
import { ValidationError, NotFoundError } from '../../lib/errors';

export async function deactivateInvitation(invitationId: string) {
  if (!isValidUUID(invitationId)) {
    throw new ValidationError('id is not in valid UUID format');
  }

  const result = await db.query(
    'UPDATE user_invitations SET is_active = false WHERE id = $1',
    [invitationId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Invitation code not found');
  }
}
