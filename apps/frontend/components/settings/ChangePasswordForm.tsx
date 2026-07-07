'use client';

import React, { useState, useEffect } from 'react';

interface ChangePasswordFormProps {
  api: string;
  mustChangePassword: boolean;
  setMustChangePassword: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMainPanel: (show: boolean) => void;
  setShowLogoutOthersConfirm: (show: boolean) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function ChangePasswordForm({
  api,
  mustChangePassword,
  setMustChangePassword,
  setShowMainPanel,
  setShowLogoutOthersConfirm,
  t
}: ChangePasswordFormProps): React.JSX.Element {
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePasswordMsg, setChangePasswordMsg] = useState<string>('');

  useEffect(() => {
    if (changePasswordMsg) {
      const timer = setTimeout(() => setChangePasswordMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [changePasswordMsg]);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
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
  );
}
