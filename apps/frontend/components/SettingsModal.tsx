'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useConfirm } from '../context/ConfirmContext';
import { useCloud } from '../context/CloudContext';

interface User {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
  mustChangePassword: boolean;
  avatarUrl?: string;
}

interface Invitation {
  id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
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

async function readErrorMessage(res: Response, translateFn: (key: string, replacements?: Record<string, string | number>) => string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.message) return String(data.message);
    return JSON.stringify(data);
  } catch {
    try {
      const txt = await res.text();
      if (txt) return txt.slice(0, 300);
    } catch { }
  }
  return translateFn('messages.noDetailFromServer');
}

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

  // State cho quản lý mã mời (Admin)
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [maxUsesInput, setMaxUsesInput] = useState<number | string>(1);
  const [isUnlimitedUses, setIsUnlimitedUses] = useState<boolean>(false);
  const [expiresType, setExpiresType] = useState<'hours' | 'date'>('hours');
  const [expiresInHoursInput, setExpiresInHoursInput] = useState<number | string>('');
  const [expiresDateInput, setExpiresDateInput] = useState<string>('');
  const [createInviteMsg, setCreateInviteMsg] = useState<string>('');


  // Mật khẩu
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePasswordMsg, setChangePasswordMsg] = useState<string>('');
  const [showLogoutOthersConfirm, setShowLogoutOthersConfirm] = useState<boolean>(false);

  // Tự động xóa thông báo sau 4 giây
  useEffect(() => {
    if (createInviteMsg) {
      const timer = setTimeout(() => setCreateInviteMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [createInviteMsg]);

  useEffect(() => {
    if (updateProfileMsg) {
      const timer = setTimeout(() => setUpdateProfileMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [updateProfileMsg]);

  useEffect(() => {
    if (changePasswordMsg) {
      const timer = setTimeout(() => setChangePasswordMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [changePasswordMsg]);

  useEffect(() => {
    if (isOpen) {
      setShowMainPanel(true);
      setSettingsTab(mustChangePassword ? 'profile' : 'general');
      setProfileNameInput(user?.name || '');
      setUpdateProfileMsg('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordMsg('');
      setCreateInviteMsg('');


      const savedSandbox = localStorage.getItem('default_sandbox_mode');
      setDefaultSandboxModeState(savedSandbox === 'off' ? 'off' : 'on');
    }
  }, [isOpen, user, mustChangePassword]);

  useEffect(() => {
    if (isOpen && settingsTab === 'invites' && user?.role === 'admin') {
      loadInvitations();
    }
  }, [isOpen, settingsTab, user]);

  async function loadInvitations() {
    try {
      const res = await fetch(`${api}/api/admin/invitations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Không tải được danh sách mã mời:', err);
    }
  }



  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

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

  async function handleCreateInvitation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateInviteMsg('');
    try {
      const body: any = {
        max_uses: isUnlimitedUses ? 0 : (maxUsesInput ? parseInt(String(maxUsesInput), 10) : 1)
      };
      if (expiresType === 'hours') {
        if (expiresInHoursInput) {
          body.expires_in_hours = parseInt(String(expiresInHoursInput), 10);
        }
      } else if (expiresType === 'date') {
        if (expiresDateInput) {
          const dateObj = new Date(`${expiresDateInput}T23:59:59`);
          body.expires_at = dateObj.toISOString();
        }
      }
      const res = await fetch(`${api}/api/admin/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setCreateInviteMsg(t('invite.createSuccess'));
        setMaxUsesInput(1);
        setIsUnlimitedUses(false);
        setExpiresInHoursInput('');
        setExpiresDateInput('');
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateInviteMsg(`${t('messages.error')}: ${data.message || t('invite.createError')}`);
      }
    } catch (err: any) {
      setCreateInviteMsg(`${t('messages.error')}: ${err.message}`);
    }
  }

  async function handleDeactivateInvitation(id: string) {
    if (!await confirm(t('invite.confirmLock'), { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/admin/invitations/${id}/deactivate`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (res.ok) {
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`${t('messages.error')}: ${data.message}`);
      }
    } catch (err: any) {
      alert(`${t('messages.error')}: ${err.message}`);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChangePasswordMsg('');
    if (newPassword !== confirmPassword) {
      setChangePasswordMsg(t('settings.changePasswordMatchError'));
      return;
    }

    try {
      const res = await fetch(`${api}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (res.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordMsg('');
        
        if (mustChangePassword) {
          setMustChangePassword(false);
        }
        
        setShowMainPanel(false);
        setShowLogoutOthersConfirm(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setChangePasswordMsg(`${t('messages.error')}: ${data.message || t('settings.changePasswordError')}`);
      }
    } catch (err: any) {
      setChangePasswordMsg(`${t('messages.error')}: ${err.message || t('messages.connectionError')}`);
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

                    {/* Cột phải: Form đổi mật khẩu */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('settings.oldPassword')}</label>
                          <input 
                            type="password" 
                            value={oldPassword} 
                            onChange={(e) => setOldPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('settings.newPassword')}</label>
                          <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('settings.confirmPassword')}</label>
                          <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>

                        <div style={{
                          maxHeight: changePasswordMsg ? '80px' : '0px',
                          opacity: changePasswordMsg ? 1 : 0,
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', fontSize: '12.5px', border: '1px solid rgba(244, 63, 94, 0.12)' }}>
                            {changePasswordMsg}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          <button 
                            type="submit"
                            style={{
                              width: '100%',
                              padding: '9px 18px',
                              borderRadius: '6px',
                              border: 0,
                              backgroundColor: 'var(--button-primary-bg)',
                              color: 'var(--button-primary-text)',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '13.5px',
                              transition: 'opacity 0.15s ease',
                              boxShadow: '0 4px 12px var(--button-primary-shadow)'
                            }}
                            onMouseEnter={(e: any) => { e.target.style.opacity = '0.9'; }}
                            onMouseLeave={(e: any) => { e.target.style.opacity = '1'; }}
                          >
                            {t('settings.changePassword')}
                          </button>
                          
                          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: '1.3', marginTop: '4px' }}>
                            {t('settings.strongPassword')}: {t('settings.strongPasswordRequirement1')} &middot; {t('settings.strongPasswordRequirement2')}
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. QUẢN LÝ MÃ MỜI (ADMIN ONLY) */}
              {settingsTab === 'invites' && user?.role === 'admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'visible', animation: 'tabSlideIn 0.2s ease-out' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: 'var(--text-primary)', fontWeight: '600' }}>{t('invite.title')}</h3>
                  
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'visible' }}>
                    {/* Cột trái: Form tạo mã mời */}
                    <div style={{
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      paddingRight: '24px',
                      borderRight: '1px solid var(--border-color)',
                      boxSizing: 'border-box',
                      justifyContent: 'center'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{t('invite.createTitle')}</h4>
                      <form onSubmit={handleCreateInvitation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('invite.maxUses')}</label>
                          
                          {/* Premium Switch Toggle */}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}>
                            <div style={{
                              width: '28px',
                              height: '16px',
                              backgroundColor: isUnlimitedUses ? '#4f46e5' : 'var(--border-input)',
                              borderRadius: '99px',
                              padding: '2px',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: isUnlimitedUses ? 'flex-end' : 'flex-start',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#ffffff',
                                borderRadius: '50%',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s'
                              }} />
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isUnlimitedUses} 
                              onChange={(e) => {
                                setIsUnlimitedUses(e.target.checked);
                                if (e.target.checked) setMaxUsesInput('');
                                else setMaxUsesInput(1);
                              }}
                              style={{ display: 'none' }}
                            />
                            <span>{t('invite.unlimited')}</span>
                          </label>
                          
                          <input 
                            type="number" 
                            min="1" 
                            placeholder={isUnlimitedUses ? '∞' : '1'}
                            disabled={isUnlimitedUses}
                            value={isUnlimitedUses ? '' : maxUsesInput} 
                            onChange={(e) => setMaxUsesInput(e.target.value)} 
                            required={!isUnlimitedUses}
                            className="no-spinner"
                            style={{ width: '100%', background: isUnlimitedUses ? 'var(--bg-item-hover)' : 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '7px 10px', color: isUnlimitedUses ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box', opacity: isUnlimitedUses ? 0.6 : 1 }}
                            onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('invite.expiry')}</label>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <button 
                              type="button" 
                              onClick={() => { setExpiresType('hours'); setExpiresDateInput(''); }}
                              style={{
                                flex: 1,
                                background: expiresType === 'hours' ? 'var(--bg-item-active)' : 'transparent',
                                border: '1px solid var(--border-input)',
                                borderRadius: '4px',
                                color: expiresType === 'hours' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                padding: '5px 0',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {t('invite.byHour')}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setExpiresType('date'); setExpiresInHoursInput(''); }}
                              style={{
                                flex: 1,
                                background: expiresType === 'date' ? 'var(--bg-item-active)' : 'transparent',
                                border: '1px solid var(--border-input)',
                                borderRadius: '4px',
                                color: expiresType === 'date' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                padding: '5px 0',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {t('invite.byDay')}
                            </button>
                          </div>
                          
                          {expiresType === 'hours' ? (
                            <input 
                              key="hours-input"
                              type="number" 
                              min="1" 
                              placeholder={t('invite.noExpiry')}
                              value={expiresInHoursInput} 
                              onChange={(e) => setExpiresInHoursInput(e.target.value)} 
                              className="no-spinner tab-content-fade"
                              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box' }}
                              onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                              onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                            />
                          ) : (
                            <div key="date-input" className="tab-content-fade">
                              <CustomDatePicker 
                                value={expiresDateInput} 
                                onChange={setExpiresDateInput} 
                                minDate={todayStr}
                                lang={language}
                              />
                              <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: '1.4' }}>
                                {t('invite.expiryDateHint')}
                              </span>
                            </div>
                          )}
                        </div>

                        <button 
                          type="submit" 
                          style={{
                            background: 'var(--button-primary-bg)',
                            color: 'var(--button-primary-text)',
                            border: 0,
                            borderRadius: '6px',
                            padding: '8px 14px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease',
                            marginTop: '4px',
                            boxShadow: '0 4px 12px var(--button-primary-shadow)'
                          }}
                          onMouseEnter={(e: any) => { e.target.style.opacity = '0.9'; }}
                          onMouseLeave={(e: any) => { e.target.style.opacity = '1'; }}
                        >
                          {t('invite.createBtn')}
                        </button>

                        <div style={{
                          maxHeight: createInviteMsg ? '80px' : '0px',
                          opacity: createInviteMsg ? 1 : 0,
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          overflow: 'hidden',
                          marginTop: createInviteMsg ? '8px' : '0px'
                        }}>
                          <div style={{
                            fontSize: '11.5px',
                            color: createInviteMsg?.startsWith(t('messages.error')) ? '#fca5a5' : '#a7f3d0',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: createInviteMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${createInviteMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`,
                            wordBreak: 'break-word'
                          }}>
                            {createInviteMsg}
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Cột phải: Danh sách mã mời */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                      <h4 style={{ margin: '0', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{t('invite.listTitle')}</h4>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '12px', lineHeight: '1.4' }}>
                        {t('invite.clickToCopyHint')}
                      </div>
                      <div style={{
                        flex: 1,
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        overflowY: 'auto',
                        background: 'var(--bg-input)',
                        overflowX: 'hidden'
                      }}>
                        {invitations.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                            {t('invite.emptyList')}
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-item-hover)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colCode')}</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colUses')}</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colExpiry')}</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colStatus')}</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'right' }}>{t('invite.colAction')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invitations.map((inv) => {
                                const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                                const isActive = inv.is_active && !isExpired && (inv.max_uses === null || inv.uses_count < inv.max_uses);
                                return (
                                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="tableRowHover">
                                    <td 
                                      onClick={() => {
                                        if (isActive) {
                                          navigator.clipboard.writeText(inv.token);
                                          addToast(t('invite.copySuccess', { token: inv.token }) || `Copied link: ${inv.token}`, 'info');
                                        } else {
                                          addToast(t('invite.copyLocked') || 'Invite code is locked!', 'error');
                                        }
                                      }}
                                      title={isActive ? t('invite.titleCopyActive') : t('invite.titleCopyLocked')}
                                      style={{ 
                                        padding: '8px 10px', 
                                        fontWeight: '700', 
                                        color: isActive ? '#3b82f6' : 'var(--text-muted)', 
                                        fontFamily: 'monospace', 
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        textDecoration: isActive ? 'none' : 'line-through'
                                      }}
                                      onMouseEnter={(e: any) => { if (isActive) e.currentTarget.style.color = '#60a5fa'; }}
                                      onMouseLeave={(e: any) => { if (isActive) e.currentTarget.style.color = '#3b82f6'; }}
                                    >
                                      {inv.token}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>{inv.uses_count}/{inv.max_uses || '∞'}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                                      {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('vi-VN') : t('invite.noExpiry')}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                      {isActive ? (
                                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>{t('invite.statusActive')}</span>
                                      ) : (
                                        <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>{t('invite.statusLocked')}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                      {isActive && (
                                        <button 
                                          onClick={() => handleDeactivateInvitation(inv.id)}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(244, 63, 94, 0.25)',
                                            color: '#f43f5e',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '10.5px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e: any) => { e.target.style.background = 'rgba(244, 63, 94, 0.06)'; e.target.style.borderColor = '#f43f5e'; }}
                                          onMouseLeave={(e: any) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(244, 63, 94, 0.25)'; }}
                                        >
                                          {t('invite.actionLock')}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
