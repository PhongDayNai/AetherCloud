'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from '../Icons';
import CustomSelect from '../CustomSelect';

interface User {
  sub: string;
  email: string;
  name: string;
}

interface GroupMembersListProps {
  groupId: string;
  localRole: 'owner' | 'admin' | 'member';
  setLocalRole: (role: 'owner' | 'admin' | 'member') => void;
  user: User | null;
  api: string;
  addToast: (msg: string, type: 'info' | 'error') => void;
  confirm: (msg: string, options?: any) => Promise<boolean>;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: 'vi' | 'en';
  styles: Record<string, string>;
  onClose: () => void;
  loadData: () => Promise<void>;
}

export default function GroupMembersList({
  groupId,
  localRole,
  setLocalRole,
  user,
  api,
  addToast,
  confirm,
  t,
  language,
  styles,
  onClose,
  loadData
}: GroupMembersListProps): React.JSX.Element {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [kickedUserIds, setKickedUserIds] = useState<string[]>([]);

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return t('groups.roleOwner') || 'Owner';
    if (role === 'admin') return t('groups.roleAdmin') || 'Admin';
    return t('groups.roleMember') || 'Member';
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/members`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || 'Bạn không còn quyền truy cập nhóm này.', 'error');
          onClose();
          await loadData();
          return;
        }
        throw new Error('Failed to fetch members');
      }
      const data = await res.json();
      // Sắp xếp thứ tự: Owner -> Admin -> Member
      const sorted = (data.members || []).sort((a: any, b: any) => {
        const roleWeights = { owner: 3, admin: 2, member: 1 };
        const wA = roleWeights[a.role as keyof typeof roleWeights] || 0;
        const wB = roleWeights[b.role as keyof typeof roleWeights] || 0;
        return wB - wA;
      });
      setMembers(sorted);

      // Cập nhật vai trò cục bộ realtime của chính mình
      const me = sorted.find((m: any) => m.user_id === user?.sub);
      if (me) {
        setLocalRole(me.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  // Listen to realtime update events
  useEffect(() => {
    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { metadata } = customEvent.detail || {};
      if (metadata && metadata.groupId === groupId) {
        fetchMembers();
      }
    };
    window.addEventListener('group-update', handleGroupUpdate);
    return () => window.removeEventListener('group-update', handleGroupUpdate);
  }, [groupId]);

  const handleInviteEmailDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setErrorMsg('');
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/invite-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          throw new Error(t('groups.error.userNotFound') || 'Người dùng với email này không tồn tại.');
        }
        if (data.code === 'ALREADY_MEMBER') {
          throw new Error(t('groups.error.alreadyMember') || 'Người dùng này đã là thành viên của nhóm.');
        }
        if (data.code === 'PENDING_INVITE_EXISTS') {
          throw new Error(t('groups.error.pendingInviteExists') || 'Người dùng này đã có một lời mời đang chờ phản hồi.');
        }
        throw new Error(data.message || t('groups.inviteFailed') || 'Mời thành viên thất bại');
      }
      addToast(t('groups.inviteSuccess') || 'Gửi lời mời thành công!', 'info');
      setInviteEmail('');
      fetchMembers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    const confirmKey = newRole === 'admin' ? 'groups.confirmPromote' : 'groups.confirmDemote';
    if (!await confirm(t(confirmKey))) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/members/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.promoteFailed'));
      }
      const msgKey = newRole === 'admin' ? 'groups.promoteSuccess' : 'groups.demoteSuccess';
      addToast(t(msgKey) || 'Cập nhật chức vụ thành công', 'info');
      fetchMembers();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleKick = async (userId: string) => {
    if (!await confirm(t('groups.confirmKick') || 'Bạn có chắc chắn muốn trục xuất thành viên này?', { isDanger: true })) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.kickFailed'));
      }

      setKickedUserIds((prev) => [...prev, userId]);

      setTimeout(() => {
        fetchMembers();
        setKickedUserIds((prev) => prev.filter((id) => id !== userId));
      }, 400);

      addToast(t('groups.kickSuccess') || 'Đã trục xuất thành viên', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTransferOwnership = async (userId: string) => {
    if (!await confirm(t('groups.confirmTransfer') || 'CẢNH BÁO: Bạn sẽ mất quyền Chủ nhóm sau khi chuyển nhượng. Tiếp tục?', { isDanger: true })) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/owner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.transferFailed'));
      }
      addToast(t('groups.transferSuccess') || 'Đã chuyển nhượng nhóm thành công', 'info');
      onClose();
      await loadData();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className={`${styles.panelBody} ${styles.scrollable} custom-scrollbar`}>
      {/* Form mời email */}
      {localRole !== 'member' && (
        <div className={styles.inviteSection}>
          <h3 className={styles.sectionSubtitle}>{t('groups.inviteSectionTitle') || 'Mời thành viên mới'}</h3>
          <form onSubmit={handleInviteEmailDirect} className={styles.inviteForm}>
            {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}
            <div className={styles.inviteRow}>
              <input
                type="email"
                placeholder={t('groups.inviteEmail') || 'Email người nhận...'}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={loading}
              />
              <CustomSelect
                value={inviteRole}
                options={[
                  { value: 'member', label: t('groups.roleMember') || 'Thành viên' },
                  { value: 'admin', label: t('groups.roleAdmin') || 'Admin' }
                ]}
                onChange={(val) => setInviteRole(val as any)}
                disabled={localRole === 'admin' || loading}
                width="135px"
              />
              <button type="submit" disabled={!inviteEmail.trim() || loading} className={styles.inviteBtn}>
                <Icons.Plus size={14} style={{ marginRight: '4px' }} />
                {t('groups.inviteBtn') || 'Mời'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách thành viên */}
      <div className={styles.membersListContainer}>
        <h3 className={styles.sectionSubtitle}>{t('groups.membersListTitle') || 'Danh sách thành viên'}</h3>
        {loading && members.length === 0 ? (
          <div className={styles.loadingText}>{t('sidebar.loading') || 'Đang tải...'}</div>
        ) : (
          <div className={styles.membersList}>
            {members.map((member) => {
              const isLeaving = kickedUserIds.includes(member.user_id);
              const isMe = member.user_id === user?.sub;
              return (
                <div key={member.user_id} className={`${styles.memberRow} ${isLeaving ? styles.leaving : ''}`}>
                  <div className={styles.avatar}>
                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.name}>
                      {member.name || member.email}
                      {isMe && <span className={styles.meTag}>{t('groups.meTag') || '(Tôi)'}</span>}
                    </div>
                    <div className={styles.email}>{member.email}</div>
                  </div>

                  <div className={styles.roleActions}>
                    <span className={`${styles.roleBadge} ${styles[member.role] || styles.member}`}>
                      {getRoleLabel(member.role).toUpperCase()}
                    </span>

                    {!isMe && localRole !== 'member' && member.role !== 'owner' && actionLoadingId !== member.user_id && !isLeaving && (
                      <div className={styles.actionButtons}>
                        {localRole === 'owner' && (
                          <>
                            {member.role === 'admin' ? (
                              <button
                                onClick={() => handleUpdateRole(member.user_id, 'member')}
                                title={t('groups.demoteBtn') || 'Hạ xuống thành viên'}
                                className={styles.actionIconBtn}
                              >
                                <Icons.ChevronDown size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateRole(member.user_id, 'admin')}
                                title={t('groups.promoteBtn') || 'Thăng cấp Quản trị viên'}
                                className={styles.actionIconBtn}
                              >
                                <Icons.ChevronUp size={14} />
                              </button>
                            )}

                            <button
                              onClick={() => handleTransferOwnership(member.user_id)}
                              title={t('groups.transferBtn') || 'Nhượng chức Chủ nhóm'}
                              className={`${styles.actionIconBtn} ${styles.ownershipBtn}`}
                            >
                              <Icons.Transfer size={14} />
                            </button>
                          </>
                        )}

                        {/* Owner có quyền kick bất kỳ ai, Admin có quyền kick member thường */}
                        {(localRole === 'owner' || (localRole === 'admin' && member.role === 'member')) && (
                          <button
                            onClick={() => handleKick(member.user_id)}
                            title={t('groups.kickBtn') || 'Trục xuất'}
                            className={`${styles.actionIconBtn} ${styles.kickBtn}`}
                          >
                            <Icons.Close size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {actionLoadingId === member.user_id && (
                      <Icons.Refresh size={14} className={styles.spinner} style={{ color: 'var(--text-muted, #71717a)' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
