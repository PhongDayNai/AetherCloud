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
}

export default function ProfileMenu({
  user,
  setShowSettingsModal,
  handleLogout,
  t
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
              <div className={styles.profileName}>{user ? (user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })) : t('sidebar.loading')}</div>
              <div className={styles.profileRole}>{user ? (user.role === 'admin' ? t('profile.admin') : t('profile.member')) : ''}</div>
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
                <div className={styles.popoverUserName}>{user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })}</div>
                <div className={styles.popoverUserBadge}>
                  {user.role === 'admin' ? t('profile.admin') : t('profile.member')}
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
