'use client';

import React, { useState } from 'react';

const Icons = {
  User: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Lock: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Key: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
};

interface RegisterFormProps {
  apiOrigin: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  onToggleToLogin: () => void;
}

interface MsgState {
  key?: string;
  text?: string;
  type: 'success' | 'error';
}

export default function RegisterForm({
  apiOrigin,
  t,
  onToggleToLogin
}: RegisterFormProps): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [msg, setMsg] = useState<MsgState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setIsLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMsg({ key: 'messages.invalidEmail', type: 'error' });
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setMsg({ key: 'messages.passwordTooShort', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const ctrl = new AbortController();
      const tSig = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${apiOrigin}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, invite_code: inviteCode }),
        signal: ctrl.signal,
      });

      clearTimeout(tSig);
      setIsLoading(false);

      if (res.ok) {
        setMsg({ key: 'messages.registerSuccess', type: 'success' });
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg({
        type: 'error',
        key: data.message ? undefined : 'messages.registerFailed',
        text: data.message ? data.message : undefined
      });
    } catch (err: any) {
      setIsLoading(false);
      if (err?.name === 'AbortError') {
        setMsg({ key: 'messages.timeout', type: 'error' });
      } else {
        setMsg({
          type: 'error',
          key: err?.message ? undefined : 'messages.connectionError',
          text: err?.message ? err.message : undefined
        });
      }
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="form" noValidate>
        <div className="input-group">
          <label className="label">{t('fields.name')}</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icons.User /></span>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder={t('placeholders.name')} 
              required
              className="input"
            />
          </div>
        </div>
        
        <div className="input-group">
          <label className="label">{t('fields.email')}</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icons.Mail /></span>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={t('placeholders.email')} 
              type="email"
              required
              className="input"
            />
          </div>
        </div>
        
        <div className="input-group">
          <label className="label">{t('fields.password')}</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icons.Lock /></span>
            <input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={t('placeholders.password')} 
              type="password" 
              minLength={8}
              required
              className="input"
            />
          </div>
        </div>
        
        <div className="input-group">
          <label className="label">{t('fields.inviteCode')}</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icons.Key /></span>
            <input 
              value={inviteCode} 
              onChange={(e) => setInviteCode(e.target.value)} 
              placeholder={t('placeholders.inviteCode')} 
              maxLength={6}
              required
              className="input invite-input"
            />
          </div>
        </div>

        <button 
          disabled={isLoading}
          className="submit-btn"
        >
          {isLoading ? (
            <span className="spinner-container">
              <span className="spinner" /> {t('buttons.processing')}
            </span>
          ) : t('buttons.register')}
        </button>
      </form>

      <div className="toggle-container">
        <p>
          {t('toggle.hasAccount')}{' '}
          <span 
            onClick={onToggleToLogin} 
            className="toggle-link"
          >
            {t('toggle.loginNow')}
          </span>
        </p>
      </div>

      {msg && (
        <div className={`message ${msg.type === 'error' ? 'error-msg' : 'success-msg'}`}>
          {msg.key ? t(msg.key) : msg.text}
        </div>
      )}
    </>
  );
}
