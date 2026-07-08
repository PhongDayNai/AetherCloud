'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import styles from './page.module.css';

function getApiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

export default function LoginPage(): React.JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const [isLogin, setIsLogin] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
    
    (async () => {
      try {
        const r = await fetch(`${getApiOrigin()}/api/auth/me`, { credentials: 'include' });
        if (!mounted) return;
        if (r.ok) window.location.href = redirectUrl;
      } catch { }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <div className={styles.container}>
      {/* Floating Language Switcher */}
      <div className={styles.langSwitcher}>
        <button 
          type="button"
          onClick={() => setLanguage('vi')} 
          className={`${styles.langBtn} ${language === 'vi' ? styles.active : ''}`}
        >
          VI
        </button>
        <button 
          type="button"
          onClick={() => setLanguage('en')} 
          className={`${styles.langBtn} ${language === 'en' ? styles.active : ''}`}
        >
          EN
        </button>
      </div>

      {/* Dynamic Background Glows */}
      <div className={`${styles.glow} ${styles.glow1}`} />
      <div className={`${styles.glow} ${styles.glow2}`} />
      <div className={`${styles.glow} ${styles.glow3}`} />

      <main className={styles.card}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.36 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C8.08 7.14 9.94 6 12 6C14.89 6 17.31 8.05 17.82 10.9L18.09 12.4L19.61 12.51C20.96 12.61 22 13.72 22 15C22 16.65 20.65 18 19 18Z" fill="url(#logo-grad)"/>
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="4" x2="24" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60a5fa" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.logoText}>AETHERCLOUD</h1>
        </div>

        <h2 className={styles.title}>
          {isLogin ? t('login.title') : t('register.title')}
        </h2>
        <p className={styles.subtitle}>
          {isLogin ? t('login.subtitle') : t('register.subtitle')}
        </p>

        {isLogin ? (
          <LoginForm 
            apiOrigin={getApiOrigin()}
            t={t}
            onToggleToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm 
            apiOrigin={getApiOrigin()}
            t={t}
            onToggleToLogin={() => setIsLogin(true)}
          />
        )}
      </main>
    </div>
  );
}
