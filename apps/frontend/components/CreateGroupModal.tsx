'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

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
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>{t('groups.createTitle') || 'Tạo nhóm chia sẻ mới'}</h2>
          <button className="closeBtn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          {errorMsg && <div className="errorBanner">{errorMsg}</div>}

          <div className="formGroup">
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

          <div className="formActions">
            <button type="button" className="actionBtnCancel" onClick={onClose} disabled={loading}>
              {t('actions.cancel') || 'Hủy'}
            </button>
            <button type="submit" className="actionBtnSubmit" disabled={!name.trim() || loading}>
              {loading ? (t('buttons.processing') || 'Đang tạo...') : (t('sidebar.createGroup') || 'Tạo nhóm')}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modalBackdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-backdrop);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: backdropFadeIn 0.25s ease-out;
        }
        .modalContent {
          background: var(--bg-modal-wrapper);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-strong);
          border-radius: 20px;
          padding: 22px;
          width: 90%;
          max-width: 400px;
          box-shadow: var(--modal-shadow);
          box-sizing: border-box;
          animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: var(--text-primary);
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modalHeader h2 {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.4px;
          margin: 0;
        }
        .closeBtn {
          background: transparent;
          border: 0;
          color: var(--text-muted);
          font-size: 18px;
          cursor: pointer;
          transition: color 0.2s;
          padding: 4px;
        }
        .closeBtn:hover {
          color: var(--text-primary);
        }
        .modalForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .errorBanner {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.15);
          color: #fca5a5;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12.5px;
        }
        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .formGroup label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .formGroup input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          box-sizing: border-box;
          border-radius: 8px;
          border: 1px solid var(--border-input);
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-size: 13.5px;
          outline: none;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .formGroup input[type="text"]:focus {
          border-color: var(--border-input-focus);
          background: var(--bg-input-focus);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        
        .formActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .actionBtnCancel {
          background: transparent;
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .actionBtnCancel:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
        }
        .actionBtnSubmit {
          background: var(--button-primary-bg);
          border: 1px solid var(--button-primary-bg);
          color: var(--button-primary-text);
          border-radius: 8px;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px var(--button-primary-shadow);
          transition: all 0.2s ease;
        }
        .actionBtnSubmit:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .actionBtnSubmit:disabled,
        .actionBtnCancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

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
      `}</style>
    </div>
  );
}
