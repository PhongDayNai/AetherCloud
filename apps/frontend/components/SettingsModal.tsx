'use client';

import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useConfirm } from '../context/ConfirmContext';
import { useCloud } from '../context/CloudContext';
import ChangePasswordForm from './settings/ChangePasswordForm';
import AdminInvitations from './settings/AdminInvitations';

interface User {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
  mustChangePassword: boolean;
  avatarUrl?: string;
}

const Icons = {
  Lock: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  LogOut: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Key: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  User: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  mustChangePassword: boolean;
  setMustChangePassword: React.Dispatch<React.SetStateAction<boolean>>;
  setMsg: (msg: string) => void;
  setErr: (err: string) => void;
  api: string;
  groupByTimeEnabled: boolean;
  setGroupByTimeEnabled: (v: boolean) => void;
  groupMode: 'month' | 'year';
  setGroupMode: (mode: 'month' | 'year') => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  setUser,
  mustChangePassword,
  setMustChangePassword,
  setMsg,
  setErr,
  api,
  groupByTimeEnabled,
  setGroupByTimeEnabled,
  groupMode,
  setGroupMode
}: SettingsModalProps): React.JSX.Element | null {
  const { language, setLanguage, t } = useLanguage();
  const { theme: appearance, setTheme: setAppearance } = useTheme();
  const confirm = useConfirm();
  const { addToast } = useCloud();

  const [showMainPanel, setShowMainPanel] = useState<boolean>(true);
  const [settingsTab, setSettingsTab] = useState<'general' | 'profile' | 'invites'>('general');
  const [profileNameInput, setProfileNameInput] = useState<string>('');
  const [updateProfileMsg, setUpdateProfileMsg] = useState<string>('');
  const [defaultSandboxMode, setDefaultSandboxModeState] = useState<'on' | 'off'>('on');
  const [showLogoutOthersConfirm, setShowLogoutOthersConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (updateProfileMsg) {
      const timer = setTimeout(() => setUpdateProfileMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [updateProfileMsg]);

  useEffect(() => {
    if (isOpen) {
      setShowMainPanel(true);
      setSettingsTab(mustChangePassword ? 'profile' : 'general');
      setProfileNameInput(user?.name || '');
      setUpdateProfileMsg('');

      const savedSandbox = localStorage.getItem('default_sandbox_mode');
      setDefaultSandboxModeState(savedSandbox === 'off' ? 'off' : 'on');
    }
  }, [isOpen, user, mustChangePassword]);

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUpdateProfileMsg('');
    try {
      const res = await fetch(`${api}/api/auth/update-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileNameInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUpdateProfileMsg(t('settings.updateProfileSuccess'));
      } else {
        const data = await res.json().catch(() => ({}));
        setUpdateProfileMsg(`${t('messages.error')}: ${data.message || t('settings.updateProfileError')}`);
      }
    } catch (err: any) {
      setUpdateProfileMsg(`${t('messages.error')}: ${err.message}`);
    }
  }

  async function handleLogoutOthers(confirm: boolean) {
    if (confirm) {
      try {
        const res = await fetch(`${api}/api/auth/logout-others`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          setMsg(t('dialogs.logoutOthersSuccess'));
        } else {
          const data = await res.json().catch(() => ({}));
          setErr(t('dialogs.logoutOthersFail', { message: data.message || '' }));
        }
      } catch (err: any) {
        setErr(`${t('messages.connectionError')}: ${err.message}`);
      }
    }
    setShowLogoutOthersConfirm(false);
    onClose();
  }

  if (!isOpen && !showLogoutOthersConfirm) return null;

  return (
    <>
      {isOpen && showMainPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-backdrop)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'backdropFadeIn 0.25s ease-out'
        }} onClick={() => { if (!mustChangePassword) onClose(); }}>
          <style>{`
            @keyframes backdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalScaleIn {
              from {
                opacity: 0;
                transform: scale(0.96) translateY(12px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            @keyframes tabSlideIn {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .tableRowHover:hover {
              background: var(--bg-item-hover);
            }
            input.no-spinner::-webkit-outer-spin-button,
            input.no-spinner::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input.no-spinner[type=number] {
              -moz-appearance: textfield;
            }
            @keyframes alertFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .alert-animation {
              animation: alertFadeIn 0.22s ease-out forwards;
            }
            @keyframes tabContentFade {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .tab-content-fade {
              animation: tabContentFade 0.22s ease-out forwards;
            }
          `}</style>
          <div style={{
            display: 'flex',
            gap: '24px',
            width: '90%',
            maxWidth: '880px',
            height: '460px',
            alignItems: 'stretch',
            animation: 'modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: 'var(--bg-modal-wrapper)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-strong)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: 'var(--modal-shadow)',
            boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Cột các tab Option bên trái */}
            <div style={{
              width: '180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0
            }}>
              <button 
                onClick={() => setSettingsTab('general')}
                style={{
                  background: settingsTab === 'general' ? 'var(--bg-item-active)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: settingsTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '11px 12px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e: any) => { if (settingsTab !== 'general') e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e: any) => { if (settingsTab !== 'general') e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'general' ? 1 : 0.7 }}><Icons.Settings /></span>
                <span>{t('settings.tabGeneral')}</span>
              </button>

              <button 
                onClick={() => setSettingsTab('profile')}
                style={{
                  background: settingsTab === 'profile' ? 'var(--bg-item-active)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: settingsTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '11px 12px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e: any) => { if (settingsTab !== 'profile') e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e: any) => { if (settingsTab !== 'profile') e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'profile' ? 1 : 0.7 }}><Icons.User /></span>
                <span>{t('settings.tabProfile')}</span>
              </button>

              {user?.role === 'admin' && (
                <button 
                  onClick={() => setSettingsTab('invites')}
                  style={{
                    background: settingsTab === 'invites' ? 'var(--bg-item-active)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: settingsTab === 'invites' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '11px 12px',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e: any) => { if (settingsTab !== 'invites') e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e: any) => { if (settingsTab !== 'invites') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'invites' ? 1 : 0.7 }}><Icons.Key /></span>
                  <span>{t('settings.tabInvites')}</span>
                </button>
              )}
            </div>

            {/* Khung chứa nội dung tab bên phải (Premium Glassmorphism) */}
            <div style={{
              flex: 1,
              background: 'var(--bg-modal-content)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              color: 'var(--text-primary)',
              position: 'relative',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}>
              {/* Nút đóng */}
              {!mustChangePassword && (
                <button 
                  onClick={onClose}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '24px',
                    background: 'transparent',
                    border: 0,
                    color: 'var(--text-muted)',
                    fontSize: '20px',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    padding: '4px',
                    zIndex: 10
                  }}
                  onMouseEnter={(e: any) => { e.target.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e: any) => { e.target.style.color = 'var(--text-muted)'; }}
                >
                  ✕
                </button>
              )}

              {/* TABS CONTENT */}

              {/* 1. TỔNG QUAN (GENERAL) */}
              {settingsTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'tabSlideIn 0.2s ease-out' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: 'var(--text-primary)', fontWeight: '600' }}>{t('settings.tabGeneral')}</h3>

                  {/* Greeting & Quick Link card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '16px',
                        boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
                      }}>
                        {user ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {t('settings.greeting', { name: user?.name || '' })}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettingsTab('profile')}
                      style={{
                        background: 'var(--bg-item-hover)',
                        border: '1px solid var(--border-input)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-item-active)'; }}
                      onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--bg-item-hover)'; }}
                    >
                      {t('settings.editProfileLink')}
                    </button>
                  </div>

                  {/* Settings list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Row 1: Language */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '14px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {t('settings.language')}
                      </span>
                      <CustomSelect 
                        value={language}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'vi', label: 'Tiếng Việt' }
                        ]}
                        onChange={(val) => setLanguage(val as 'vi' | 'en')}
                      />
                    </div>

                    {/* Row 2: Appearance */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '14px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {t('settings.appearance')}
                      </span>
                      <CustomSelect 
                        value={appearance}
                        options={[
                          { value: 'system', label: t('settings.themeSystem') },
                          { value: 'dark', label: t('settings.themeDark') },
                          { value: 'light', label: t('settings.themeLight') }
                        ]}
                        onChange={(val) => setAppearance(val as 'system' | 'dark' | 'light')}
                      />
                    </div>

                    {/* Row 3: Group by Time */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '14px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {t('settings.groupByTime') || 'Gom nhóm theo thời gian'}
                      </span>
                      <CustomSelect 
                        value={!groupByTimeEnabled ? 'off' : groupMode}
                        options={[
                          { value: 'off', label: t('settings.groupTimeDisabled') || 'Tắt' },
                          { value: 'month', label: t('dashboard.groupMonth') || 'Theo tháng' },
                          { value: 'year', label: t('dashboard.groupYear') || 'Theo năm' }
                        ]}
                        onChange={(val) => {
                          if (val === 'off') {
                            setGroupByTimeEnabled(false);
                          } else {
                            setGroupByTimeEnabled(true);
                            setGroupMode(val as 'month' | 'year');
                          }
                        }}
                      />
                    </div>

                    {/* Row 4: Default Sandbox Mode */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '14px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {t('settings.defaultSandboxMode') || 'Default Sandbox Mode'}
                      </span>
                      <CustomSelect 
                        value={defaultSandboxMode}
                        options={[
                          { value: 'on', label: t('settings.sandboxEnabled') || 'Enabled (Read-only by default)' },
                          { value: 'off', label: t('settings.sandboxDisabled') || 'Disabled (Editable by default)' }
                        ]}
                        onChange={(val) => {
                          setDefaultSandboxModeState(val as 'on' | 'off');
                          localStorage.setItem('default_sandbox_mode', val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HỒ SƠ & BẢO MẬT (PROFILE & SECURITY) */}
              {settingsTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'tabSlideIn 0.2s ease-out' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: 'var(--text-primary)', fontWeight: '600' }}>{t('settings.tabProfile')}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {/* Cột trái: Cập nhật thông tin profile */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderRight: '1px solid var(--border-color)',
                      paddingRight: '24px'
                    }}>
                      <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('settings.displayName')}</label>
                          <input 
                            type="text" 
                            value={profileNameInput} 
                            onChange={(e) => setProfileNameInput(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('settings.emailLabel')}</label>
                          <div style={{
                            width: '100%',
                            padding: '9px 12px',
                            boxSizing: 'border-box',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-muted)',
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'not-allowed'
                          }}>
                            <span>{user?.email}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </span>
                          </div>
                        </div>

                        <div style={{
                          maxHeight: updateProfileMsg ? '80px' : '0px',
                          opacity: updateProfileMsg ? 1 : 0,
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: updateProfileMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: updateProfileMsg?.startsWith(t('messages.error')) ? '#fca5a5' : '#a7f3d0',
                            fontSize: '13px',
                            border: `1px solid ${updateProfileMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`
                          }}>
                            {updateProfileMsg}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <button 
                            type="submit"
                            style={{
                              padding: '9px 18px',
                              borderRadius: '6px',
                              border: 0,
                              backgroundColor: 'var(--button-primary-bg)',
                              color: 'var(--button-primary-text)',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'opacity 0.15s ease',
                              boxShadow: '0 4px 12px var(--button-primary-shadow)'
                            }}
                            onMouseEnter={(e: any) => { e.target.style.opacity = '0.9'; }}
                            onMouseLeave={(e: any) => { e.target.style.opacity = '1'; }}
                          >
                            {t('settings.saveChanges')}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Cột phải: Form đổi mật khẩu subcomponent */}
                    <ChangePasswordForm
                      api={api}
                      mustChangePassword={mustChangePassword}
                      setMustChangePassword={setMustChangePassword}
                      setShowMainPanel={setShowMainPanel}
                      setShowLogoutOthersConfirm={setShowLogoutOthersConfirm}
                      t={t}
                    />
                  </div>
                </div>
              )}

              {/* 3. QUẢN LÝ MÃ MỜI (ADMIN ONLY) subcomponent */}
              {settingsTab === 'invites' && user?.role === 'admin' && (
                <AdminInvitations
                  api={api}
                  user={user}
                  language={language}
                  addToast={addToast}
                  confirm={confirm}
                  t={t}
                />
              )}
            </div>

          </div>
        </div>
      )}

      {showLogoutOthersConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-backdrop)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-popover)',
            border: '1px solid var(--border-color)',
            padding: '24px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: 'var(--text-primary)',
            fontFamily: 'sans-serif',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, color: 'var(--text-primary)' }}>{t('dialogs.logoutOthersTitle')}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: 20 }}>
              {t('dialogs.logoutOthersText')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => handleLogoutOthers(false)}
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {t('dialogs.logoutOthersNo')}
              </button>
              <button 
                onClick={() => handleLogoutOthers(true)}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 0, backgroundColor: '#dc2626', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {t('dialogs.logoutOthersYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
