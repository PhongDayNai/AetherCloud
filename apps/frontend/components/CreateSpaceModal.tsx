'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import * as Icons from './Icons';
import styles from './CreateSpaceModal.module.css';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
}

export default function CreateSpaceModal({
  isOpen,
  onClose,
  onCreate
}: CreateSpaceModalProps): React.JSX.Element | null {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [type, setType] = useState<'journal' | 'collection' | 'project' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(null);
      setDescription('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t('spaces.nameRequired') || 'Vui lòng nhập tên không gian.');
      return;
    }
    if (!type) {
      setErrorMsg(t('spaces.typeRequired') || 'Vui lòng chọn phân loại không gian.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const success = await onCreate(name.trim(), type, description.trim());
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('spaces.createFailed') || 'Không tạo được không gian con.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('spaces.createTitle') || 'Tạo không gian con mới'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          <div className={styles.formGroup}>
            <label>{t('spaces.type') || 'Phân loại không gian'}</label>
            <div className={styles.typeSelectorList}>
              <div 
                className={`${styles.typeOption} ${type === 'journal' ? styles.active : ''}`}
                onClick={() => !loading && setType('journal')}
              >
                <div className={styles.optionIcon}><Icons.Journal size={20} /></div>
                <div className={styles.optionMeta}>
                  <div className={styles.optionTitle}>{t('spaces.journal') || 'Nhật ký'}</div>
                  <div className={styles.optionDesc}>{t('spaces.journalDesc') || 'Ghi chép câu chuyện, viết nhật ký kèm tệp đính kèm.'}</div>
                </div>
              </div>

              <div 
                className={`${styles.typeOption} ${type === 'collection' ? styles.active : ''}`}
                onClick={() => !loading && setType('collection')}
              >
                <div className={styles.optionIcon}><Icons.Collection size={20} /></div>
                <div className={styles.optionMeta}>
                  <div className={styles.optionTitle}>{t('spaces.collection') || 'Bộ sưu tập'}</div>
                  <div className={styles.optionDesc}>{t('spaces.collectionDesc') || 'Lưu trữ tệp tin đa phương tiện và file tài liệu chung.'}</div>
                </div>
              </div>

              <div 
                className={`${styles.typeOption} ${type === 'project' ? styles.active : ''}`}
                onClick={() => !loading && setType('project')}
              >
                <div className={styles.optionIcon}><Icons.Project size={20} /></div>
                <div className={styles.optionMeta}>
                  <div className={styles.optionTitle}>{t('spaces.project') || 'Dự án'}</div>
                  <div className={styles.optionDesc}>{t('spaces.projectDesc') || 'Quản lý file tài liệu dự án trực quan theo thư mục.'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="spaceName">{t('spaces.name') || 'Tên không gian con'}</label>
            <input
              id="spaceName"
              type="text"
              placeholder={t('spaces.namePlaceholder') || 'Ví dụ: Nhật ký cá nhân, Tài liệu dự án A...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="spaceDesc">{t('spaces.desc') || 'Mô tả (Không bắt buộc)'}</label>
            <textarea
              id="spaceDesc"
              placeholder={t('spaces.descPlaceholder') || 'Mô tả mục đích sử dụng của không gian này...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={250}
              rows={2}
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.actionBtnCancel} onClick={onClose} disabled={loading}>
              {t('actions.cancel') || 'Hủy'}
            </button>
            <button type="submit" className={styles.actionBtnSubmit} disabled={!name.trim() || !type || loading}>
              {loading ? (t('buttons.processing') || 'Đang tạo...') : (t('spaces.create') || 'Tạo không gian')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
