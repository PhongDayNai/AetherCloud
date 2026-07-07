'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useCloud } from '../context/CloudContext';
import { useConfirm } from '../context/ConfirmContext';
import * as Icons from './Icons';
import styles from './GroupSettingsModal.module.css';

import GroupMembersList from './group-settings/GroupMembersList';
import PendingInvites from './group-settings/PendingInvites';
import GroupInviteManager from './group-settings/GroupInviteManager';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: { id: string; name: string; role: 'owner' | 'admin' | 'member' } | null;
}

export default function GroupSettingsModal({
  isOpen,
  onClose,
  group
}: GroupSettingsModalProps): React.JSX.Element | null {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { api, user, addToast, loadData } = useCloud();
  const confirm = useConfirm();

  // Tab State: 'members' | 'pending' | 'invites'
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'invites'>('members');

  // Lấy vai trò của người dùng hiện tại trong nhóm này (realtime dynamic state)
  const [localRole, setLocalRole] = useState<'owner' | 'admin' | 'member'>((group?.role as any) || 'member');

  useEffect(() => {
    if (group?.role) {
      setLocalRole(group.role);
    }
  }, [group?.role]);

  useEffect(() => {
    if (isOpen && group) {
      setActiveTab('members');
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (localRole === 'member' && activeTab === 'pending') {
      setActiveTab('members');
    }
  }, [localRole, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !group) return null;

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return t('groups.roleOwner') || 'Owner';
    if (role === 'admin') return t('groups.roleAdmin') || 'Admin';
    return t('groups.roleMember') || 'Member';
  };

  const getTabTitle = () => {
    if (activeTab === 'members') return t('groups.membersListTitle') || 'Members List';
    if (activeTab === 'pending') return t('groups.pendingTab') || 'Pending Invites';
    return t('groups.invitesTab') || 'Group Invites';
  };

  // Rời nhóm
  const handleLeaveGroup = async () => {
    if (!await confirm(t('groups.confirmLeave') || 'Bạn có chắc muốn rời khỏi nhóm này không?', { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/leave`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.leaveFailed'));
      }
      addToast(t('groups.leaveSuccess') || 'Rời nhóm thành công', 'info');
      onClose();
      router.push('/cloud/dashboard');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Giải tán nhóm (Owner chỉ định)
  const handleDisbandGroup = async () => {
    if (!await confirm(t('groups.confirmDisband') || 'HÀNH ĐỘNG NÀY KHÔNG THỂ PHỤC HỒI! Bạn có chắc chắn giải tán nhóm này?', { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.deleteFailed'));
      }
      addToast(t('groups.deleteSuccess') || 'Đã giải tán nhóm thành công', 'info');
      onClose();
      router.push('/cloud/dashboard');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

        {/* SIDEBAR DỌC BÊN TRÁI */}
        <div className={styles.sidebarPanel}>
          <div className={styles.groupProfile}>
            <div className={styles.groupAvatar}>
              <Icons.Group size={24} />
            </div>
            <div className={styles.groupMeta}>
              <span className={styles.groupName} title={group.name}>{group.name}</span>
              <span className={styles.groupRole}>{getRoleLabel(localRole)}</span>
            </div>
          </div>

          <div className={styles.verticalTabs}>
            <button
              className={`${styles.verticalTabButton} ${activeTab === 'members' ? styles.active : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Icons.User size={16} />
              <span>{t('groups.membersTab') || 'Thành viên'}</span>
            </button>
            {localRole !== 'member' && (
              <button
                className={`${styles.verticalTabButton} ${activeTab === 'pending' ? styles.active : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <Icons.Info size={16} />
                <span>{t('groups.pendingTab') || 'Lời mời đang chờ'}</span>
              </button>
            )}
            <button
              className={`${styles.verticalTabButton} ${activeTab === 'invites' ? styles.active : ''}`}
              onClick={() => setActiveTab('invites')}
            >
              <Icons.Documents size={16} />
              <span>{t('groups.invitesTab') || 'Mã mời nhóm'}</span>
            </button>
          </div>

          <div className={styles.sidebarFooter}>
            {localRole === 'owner' ? (
              <button onClick={handleDisbandGroup} className={`${styles.sidebarActionBtn} ${styles.disband}`}>
                <Icons.Trash size={13} />
                <span>{t('groups.disbandBtn') || 'Giải tán nhóm'}</span>
              </button>
            ) : (
              <button onClick={handleLeaveGroup} className={`${styles.sidebarActionBtn} ${styles.leave}`}>
                <Icons.LogOut size={13} />
                <span>{t('groups.leaveBtn') || 'Rời khỏi nhóm'}</span>
              </button>
            )}
          </div>
        </div>

        {/* NỘI DUNG PANEL CHÍNH BÊN PHẢI */}
        <div className={styles.mainContentPanel}>
          <div className={styles.panelHeader}>
            <h2>{getTabTitle()}</h2>
            <button className={styles.closeBtn} onClick={onClose}>
              <Icons.Close size={16} />
            </button>
          </div>

          {/* TAB CONTENT: MEMBERS */}
          {activeTab === 'members' && (
            <GroupMembersList
              groupId={group.id}
              localRole={localRole}
              setLocalRole={setLocalRole}
              user={user}
              api={api}
              addToast={addToast}
              confirm={confirm}
              t={t}
              language={language}
              styles={styles}
              onClose={onClose}
              loadData={loadData}
            />
          )}

          {/* TAB CONTENT: PENDING INVITES */}
          {activeTab === 'pending' && localRole !== 'member' && (
            <PendingInvites
              groupId={group.id}
              api={api}
              addToast={addToast}
              confirm={confirm}
              t={t}
              language={language}
              styles={styles}
              onClose={onClose}
              loadData={loadData}
            />
          )}

          {/* TAB CONTENT: INVITES */}
          {activeTab === 'invites' && (
            <GroupInviteManager
              groupId={group.id}
              localRole={localRole}
              api={api}
              addToast={addToast}
              confirm={confirm}
              t={t}
              language={language}
              styles={styles}
              onClose={onClose}
              loadData={loadData}
            />
          )}
        </div>

      </div>
    </div>
  );
}
