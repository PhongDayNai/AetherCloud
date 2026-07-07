'use client';

import React, { useState } from 'react';

const Icons = {
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
  )
};

interface LoginFormProps {
  apiOrigin: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  onToggleToRegister: () => void;
}

export default function LoginForm({
  apiOrigin,
  t,
  onToggleToRegister
}: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');
    setIsLoading(true);

    try {
      const ctrl = new AbortController();
      const tSig = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${apiOrigin}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });

      clearTimeout(tSig);
      setIsLoading(false);

      if (res.ok) {
        setMsg(t('messages.loginSuccess'));
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg(data.message ? `${t('messages.error')}: ${data.message}` : t('messages.loginFailed'));
    } catch (err: any) {
      setIsLoading(false);
      if (err?.name === 'AbortError') {
        setMsg(t('messages.timeout'));
      } else {
        setMsg(err?.message ? `${t('messages.error')}: ${err.message}` : t('messages.connectionError'));
      }
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="form">
        <div className="input-group">
          <label className="label">{t('fields.email')}</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icons.Mail /></span>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={t('placeholders.email')} 
              type="text"
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
              required
              className="input"
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
          ) : t('buttons.login')}
        </button>
      </form>

      <div className="toggle-container">
        <p>
          {t('toggle.noAccount')}{' '}
          <span 
            onClick={onToggleToRegister} 
            className="toggle-link"
          >
            {t('toggle.registerNow')}
          </span>
        </p>
      </div>

      {msg && (
        <div className={`message ${msg.startsWith(t('messages.error')) ? 'error-msg' : 'success-msg'}`}>
          {msg}
        </div>
      )}
    </>
  );
}
