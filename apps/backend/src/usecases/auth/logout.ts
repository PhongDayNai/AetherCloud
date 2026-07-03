import * as db from '../../lib/db';
import { hashToken } from '../../lib/auth';

export async function logout(token: string | undefined) {
  if (token) {
    const refreshHash = hashToken(token);
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
  }
}
