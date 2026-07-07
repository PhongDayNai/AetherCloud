'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from '../Icons';

interface PendingInvitesProps {
  groupId: string;
  api: string;
  addToast: (msg: string, type: 'info' | 'error') => void;
  confirm: (msg: string, options?: any) => Promise<boolean>;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: 'vi' | 'en';
  styles: Record<string, string>;
  onClose: () => void;
  loadData: () => Promise<void>;
}

export default function PendingInvites({
  groupId,
  api,
  addToast,
  confirm,
  t,
  language,
  styles,
  onClose,
  loadData
}: PendingInvitesProps): React.JSX.Element {
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPendingInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/pending-invites`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || 'Bạn không còn quyền truy cập nhóm này.', 'error');
          onClose();
          await loadData();
          return;
        }
        throw new Error('Failed to fetch pending invites');
      }
      const data = await res.json();
      if (data.ok) {
        setPendingInvites(data.pending || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvites();
  }, [groupId]);

  // Listen to realtime updates
  useEffect(() => {
    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { metadata } = customEvent.detail || {};
      if (metadata && metadata.groupId === groupId) {
        fetchPendingInvites();
      }
    };
    window.addEventListener('group-update', handleGroupUpdate);
    return () => window.removeEventListener('group-update', handleGroupUpdate);
  }, [groupId]);

  const handleRevokeInvite = async (notiId: string) => {
    const msg = t('groups.confirmRevoke') || 'Bạn có chắc chắn muốn hủy lời mời này không?';
    if (!await confirm(msg, { isDanger: true })) return;
    setActionLoadingId(notiId);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/pending-invites/${notiId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const successMsg = t('groups.inviteRevokedSuccess') || 'Đã hủy lời mời thành công';
        addToast(successMsg, 'info');
        fetchPendingInvites();
      } else {
        if (data.code === 'INVITATION_ALREADY_RESOLVED') {
          throw new Error(t('groups.error.invitationAlreadyResolved') || 'Lời mời này đã được chấp nhận hoặc từ chối.');
        }
        throw new Error(data.message || 'Hủy thất bại');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return t('groups.roleOwner') || 'Owner';
    if (role === 'admin') return t('groups.roleAdmin') || 'Admin';
    return t('groups.roleMember') || 'Member';
  };

  return (
    <div className={`${styles.panelBody} ${styles.scrollable} custom-scrollbar`}>
      <div className={styles.pendingInvitesContainer}>
        <h3 className={styles.sectionSubtitle}>{t('groups.pendingInvitesTitle') || 'DANH SÁCH LỜI MỜI EMAIL ĐANG CHỜ PHẢN HỒI'}</h3>
        {loading && pendingInvites.length === 0 ? (
          <div className={styles.loadingText}>{t('sidebar.loading') || 'Đang tải...'}</div>
        ) : pendingInvites.length === 0 ? (
          <div className={styles.emptyPendingText} style={{
            fontSize: '13.5px',
            color: 'var(--text-muted, #71717a)',
            fontStyle: 'italic',
            padding: '30px 20px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px dashed rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            {t('groups.pendingEmpty') || 'Không có lời mời nào đang chờ phản hồi'}
          </div>
        ) : (
          <div className={styles.membersList} style={{ marginTop: '8px' }}>
            {pendingInvites.map((invite) => (
              <div key={invite.id} className={styles.memberRow}>
                <div className={styles.avatar} style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icons.User size={14} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.name}>
                    {invite.name || invite.email}
                    <span className={styles.pendingTag} style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted, #71717a)', fontStyle: 'italic' }}>
                      {t('groups.pendingTag') || '(Đang chờ)'}
                    </span>
                  </div>
                  <div className={styles.email}>{invite.email}</div>
                </div>
                <div className={styles.roleActions}>
                  <span className={`${styles.roleBadge} ${styles[invite.role] || styles.member}`}>{getRoleLabel(invite.role).toUpperCase()}</span>
                  {actionLoadingId === invite.id ? (
                    <Icons.Refresh size={14} className={styles.spinner} style={{ color: 'var(--text-muted, #71717a)' }} />
                  ) : (
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      title={t('groups.actionRevokeTooltip') || 'Hủy lời mời'}
                      className={`${styles.actionIconBtn} ${styles.kickBtn}`}
                    >
                      <Icons.Close size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
