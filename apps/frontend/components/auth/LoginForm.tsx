'use client';

import React, { useState } from 'react';
import styles from './auth.module.css';

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

interface MsgState {
  key?: string;
  text?: string;
  type: 'success' | 'error';
}

export default function LoginForm({
  apiOrigin,
  t,
  onToggleToRegister
}: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [msg, setMsg] = useState<MsgState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
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
        setMsg({ key: 'messages.loginSuccess', type: 'success' });
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg({
        type: 'error',
        key: data.message ? undefined : 'messages.loginFailed',
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
      <form onSubmit={onSubmit} className={styles.form} noValidate>
        <div className={styles.inputGroup}>
          <label className={styles.label}>{t('fields.email')}</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon}><Icons.Mail /></span>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={t('placeholders.email')} 
              type="text"
              required
              className={styles.input}
            />
          </div>
        </div>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>{t('fields.password')}</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon}><Icons.Lock /></span>
            <input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={t('placeholders.password')} 
              type="password" 
              required
              className={styles.input}
            />
          </div>
        </div>

        <button 
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <span className={styles.spinnerContainer}>
              <span className={styles.spinner} /> {t('buttons.processing')}
            </span>
          ) : t('buttons.login')}
        </button>
      </form>

      <div className={styles.toggleContainer}>
        <p>
          {t('toggle.noAccount')}{' '}
          <span 
            onClick={onToggleToRegister} 
            className={styles.toggleLink}
          >
            {t('toggle.registerNow')}
          </span>
        </p>
      </div>

      {msg && (
        <div className={`${styles.message} ${msg.type === 'error' ? styles.errorMsg : styles.successMsg}`}>
          {msg.key ? t(msg.key) : msg.text}
        </div>
      )}
    </>
  );
}
