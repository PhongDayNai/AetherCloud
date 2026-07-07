'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCloud } from '../../context/CloudContext';
import * as Icons from '../Icons';
import styles from '../Sidebar.module.css';

interface WorkspaceSwitcherProps {
  activeWorkspace: any;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function WorkspaceSwitcher({
  activeWorkspace,
  t
}: WorkspaceSwitcherProps): React.JSX.Element {
  const router = useRouter();
  const { 
    groups, 
    setShowCreateGroupModal,
    setShowGroupSettingsModal
  } = useCloud();
  const [showWsDropdown, setShowWsDropdown] = useState(false);

  useEffect(() => {
    if (!showWsDropdown) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const wrapper = document.querySelector(`.${styles.workspaceSwitcherWrapper}`);
      if (wrapper && !wrapper.contains(e.target as Node)) {
        setShowWsDropdown(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [showWsDropdown]);

  return (
    <div className={styles.workspaceAreaContainer} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '16px' }}>
      <div className={styles.workspaceSwitcherWrapper} style={{ flexGrow: 1, minWidth: 0, height: '40px', position: 'relative' }}>
        <div 
          className={`${styles.workspaceSwitcherContainer} ${showWsDropdown ? styles.expanded : styles.collapsed}`}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%' }}
        >
          {!showWsDropdown ? (
            <button className={styles.wsBtn} onClick={() => setShowWsDropdown(true)} style={{ width: '100%' }}>
              <span className={styles.wsIcon}>
                {activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId) ? <Icons.User /> : <Icons.Group />}
              </span>
              <span className={styles.wsName} style={{ maxWidth: '140px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId)
                  ? t('sidebar.personalCloud') || 'Không gian cá nhân'
                  : activeWorkspace.type === 'group'
                  ? activeWorkspace.name
                  : (groups.find(g => g.id === activeWorkspace.groupId)?.name || 'Loading group...')}
              </span>
              <span className={styles.wsChangeIcon}>
                <Icons.Change size={14} />
              </span>
            </button>
          ) : (
            <div className={styles.wsExpandedContent}>
              <div className={styles.wsDropdownTitle}>{t('sidebar.workspace') || 'Workspace'}</div>
              
              {/* 1. Trên cùng: Tạo nhóm mới */}
              <button 
                className={styles.wsDropdownItem} 
                onClick={() => {
                  setShowWsDropdown(false);
                  setShowCreateGroupModal(true);
                }}
                style={{ color: 'var(--text-accent)', fontWeight: 600 }}
              >
                <span className={styles.icon}><Icons.Plus /></span>
                <span>{t('sidebar.createGroup') || 'Tạo nhóm mới'}</span>
              </button>

              <div className={styles.navDivider} style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0', opacity: 0.5 }} />

              {/* 2. Thứ hai: Không gian cá nhân */}
              <button 
                className={`${styles.wsDropdownItem} ${activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId) ? styles.active : ''}`}
                onClick={() => {
                  setShowWsDropdown(false);
                  router.push('/cloud/dashboard');
                }}
              >
                <span className={styles.icon}><Icons.User /></span>
                <span className={styles.name}>{t('sidebar.personalCloud') || 'Không gian cá nhân'}</span>
                {(activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId)) && <span className={styles.activeDot} />}
              </button>
              
              <div className={styles.navDivider} style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0', opacity: 0.5 }} />
              
              {/* 3. Thứ ba trở đi: Danh sách nhóm */}
              {groups.map((group) => {
                const isCurrentActiveGroup = (activeWorkspace.type === 'group' && activeWorkspace.id === group.id) || (activeWorkspace.type === 'space' && activeWorkspace.groupId === group.id);
                return (
                  <div 
                    key={group.id} 
                    className={`${styles.wsDropdownItemWrap} ${isCurrentActiveGroup ? styles.active : ''}`}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', borderRadius: '8px' }}
                  >
                    <button
                      className={styles.wsDropdownItem}
                      onClick={() => {
                        setShowWsDropdown(false);
                        router.push(`/cloud/group/${group.id}/dashboard`);
                      }}
                      style={{ flex: 1, border: 0, background: 'transparent' }}
                    >
                      <span className={styles.icon}><Icons.Group /></span>
                      <span className={styles.name}>{group.name}</span>
                      {isCurrentActiveGroup && <span className={styles.activeDot} />}
                    </button>
                    
                    {isCurrentActiveGroup && (
                      <button 
                        className={styles.wsItemSettingsBtn} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWsDropdown(false);
                          setShowGroupSettingsModal(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 0,
                          padding: '6px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          marginRight: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icons.Settings size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Nút settings độc lập ở bên ngoài */}
      {activeWorkspace.type === 'group' && !showWsDropdown && (
        <button 
          className={styles.wsExternalSettingsBtn}
          onClick={() => setShowGroupSettingsModal(true)}
          title={t('groups.settingsTitle') || 'Thiết lập nhóm'}
        >
          <Icons.Settings size={15} />
        </button>
      )}
    </div>
  );
}
