'use client';

import React, { useState, useEffect } from 'react';
import styles from './DocViewerSettingsModal.module.css';

interface DocViewerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  setLanguage: (lang: 'en' | 'vi') => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  onDefaultSandboxChange?: (val: 'on' | 'off') => void;
}

export default function DocViewerSettingsModal({
  isOpen,
  onClose,
  language,
  setLanguage,
  t,
  onDefaultSandboxChange
}: DocViewerSettingsModalProps): React.JSX.Element | null {
  const [defaultSandbox, setDefaultSandbox] = useState<'on' | 'off'>('on');

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('default_sandbox_mode');
      setDefaultSandbox(saved === 'off' ? 'off' : 'on');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSandboxChange = (val: 'on' | 'off') => {
    setDefaultSandbox(val);
    localStorage.setItem('default_sandbox_mode', val);
    if (onDefaultSandboxChange) {
      onDefaultSandboxChange(val);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('viewer.settingsTitle') || 'Viewer Settings'}</h2>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.section}>
          {/* Language Selection */}
          <div className={styles.row}>
            <span className={styles.label}>{t('settings.language') || 'Language'}</span>
            <div className={styles.toggleButtonGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${language === 'en' ? styles.toggleBtnActive : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${language === 'vi' ? styles.toggleBtnActive : ''}`}
                onClick={() => setLanguage('vi')}
              >
                Tiếng Việt
              </button>
            </div>
          </div>

          {/* Default Sandbox Mode */}
          <div className={styles.row}>
            <span className={styles.label}>{t('settings.defaultSandboxMode') || 'Default Sandbox Mode'}</span>
            <span className={styles.description}>
              {t('viewer.settingsSandboxDesc') || 'Chế độ xem mặc định (chỉ đọc hoặc cho phép chỉnh sửa) khi chuyển đổi tệp tin.'}
            </span>
            <div className={styles.toggleButtonGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${defaultSandbox === 'on' ? styles.toggleBtnActive : ''}`}
                onClick={() => handleSandboxChange('on')}
              >
                {t('viewer.sandboxOn') || 'Enabled'}
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${defaultSandbox === 'off' ? styles.toggleBtnActive : ''}`}
                onClick={() => handleSandboxChange('off')}
              >
                {t('viewer.sandboxOff') || 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>
            {t('viewer.settingsDone') || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
