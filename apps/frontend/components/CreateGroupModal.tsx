'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import styles from './CreateGroupModal.module.css';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<boolean>;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreate
}: CreateGroupModalProps): React.JSX.Element | null {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t('groups.nameRequired') || 'Vui lòng nhập tên nhóm.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const success = await onCreate(name.trim());
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('groups.createFailed') || 'Tạo nhóm thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('groups.createTitle') || 'Tạo nhóm chia sẻ mới'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="groupName">{t('groups.name') || 'Tên nhóm'}</label>
            <input
              id="groupName"
              type="text"
              placeholder={t('placeholders.groupName') || 'Ví dụ: Nhóm học tập, Gia đình...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.actionBtnCancel} onClick={onClose} disabled={loading}>
              {t('actions.cancel') || 'Hủy'}
            </button>
            <button type="submit" className={styles.actionBtnSubmit} disabled={!name.trim() || loading}>
              {loading ? (t('buttons.processing') || 'Đang tạo...') : (t('sidebar.createGroup') || 'Tạo nhóm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
