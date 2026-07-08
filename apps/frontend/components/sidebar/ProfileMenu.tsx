'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import * as Icons from '../Icons';
import styles from '../Sidebar.module.css';

interface ProfileMenuProps {
  user: User | null;
  setShowSettingsModal: (show: boolean) => void;
  handleLogout: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  activeWorkspace: any;
  groups: any[];
}

export default function ProfileMenu({
  user,
  setShowSettingsModal,
  handleLogout,
  t,
  activeWorkspace,
  groups
}: ProfileMenuProps): React.JSX.Element {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const wrapper = document.querySelector(`.${styles.profileSwitcherWrapper}`);
      if (wrapper && !wrapper.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [showProfileMenu]);

  const getDisplayRole = () => {
    if (!user) return '';

    // 1. Nếu đang ở Group Workspace
    if (activeWorkspace?.type === 'group') {
      const role = activeWorkspace.role;
      if (role === 'owner') return t('groups.roleOwner') || 'Chủ nhóm';
      if (role === 'admin') return t('groups.roleAdmin') || 'Quản trị viên';
      return t('groups.roleMember') || 'Thành viên';
    }

    // 2. Nếu đang ở Space Workspace (nằm trong Group)
    if (activeWorkspace?.type === 'space' && activeWorkspace.groupId) {
      const group = groups.find((g: any) => g.id === activeWorkspace.groupId);
      const role = group?.role || 'member';
      if (role === 'owner') return t('groups.roleOwner') || 'Chủ nhóm';
      if (role === 'admin') return t('groups.roleAdmin') || 'Quản trị viên';
      return t('groups.roleMember') || 'Thành viên';
    }

    // 3. Nếu đang ở Personal Workspace hoặc Space cá nhân
    return user.email;
  };

  const getDisplayName = () => {
    if (!user) return t('sidebar.loading');
    return user.name;
  };

  return (
    <div className={styles.profileSwitcherWrapper}>
      <div 
        className={`${styles.profileSwitcherContainer} ${showProfileMenu ? styles.expanded : styles.collapsed}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!showProfileMenu ? (
          <div className={styles.profileBtn} onClick={(e) => { e.stopPropagation(); setShowProfileMenu(true); }}>
            <div className={styles.profileAvatar}>
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={styles.profileMeta}>
              <div className={styles.profileName}>{getDisplayName()}</div>
              <div className={styles.profileRole}>{getDisplayRole()}</div>
            </div>
            <div className={styles.profileSettingsIcon}>
              <Icons.Settings size={14} />
            </div>
          </div>
        ) : (
          user && (
            <div className={styles.profileExpandedContent}>
              <div className={styles.popoverUserHeader}>
                <div className={styles.popoverUserEmail}>{user.email}</div>
                <div className={styles.popoverUserAvatar}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className={styles.avatarImg} />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles.popoverUserName}>{getDisplayName()}</div>
                <div className={styles.popoverUserBadge}>
                  {getDisplayRole()}
                </div>
              </div>
              
              <div className={styles.navDivider} style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0', opacity: 0.5, width: '100%' }} />
              
              <button className={styles.popoverItem} onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}>
                <span className={styles.popoverIcon}><Icons.Settings size={14} /></span>
                <span>{t('profile.settings')}</span>
              </button>
              <button className={styles.popoverItem} onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
                <span className={styles.popoverIcon}><Icons.LogOut size={14} /></span>
                <span>{t('profile.logout')}</span>
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
