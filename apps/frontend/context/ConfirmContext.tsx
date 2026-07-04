'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import { useLanguage } from './LanguageContext';

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (msg: string, opts: ConfirmOptions = {}) => {
    setMessage(msg);
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="confirmBackdrop" onClick={handleCancel}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmIconWrapper">
              {options.isDanger ? (
                <svg className="confirmIcon danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg className="confirmIcon warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
            </div>
            
            <h3 className="confirmTitle">
              {options.title || t('dialogs.confirmTitle') || 'Xác nhận'}
            </h3>
            
            <p className="confirmMsg">{message}</p>
            
            <div className="confirmActions">
              <button 
                type="button" 
                className="confirmBtn cancelBtn" 
                onClick={handleCancel}
              >
                {options.cancelText || t('actions.cancel') || 'Hủy'}
              </button>
              <button 
                type="button" 
                className={`confirmBtn actionBtn ${options.isDanger ? 'dangerBtn' : ''}`}
                onClick={handleConfirm}
              >
                {options.confirmText || t('dialogs.confirmButton') || 'Xác nhận'}
              </button>
            </div>
          </div>
          
          <style jsx>{`
            .confirmBackdrop {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: var(--bg-backdrop);
              backdrop-filter: blur(12px);
              z-index: 11000;
              display: flex;
              justify-content: center;
              align-items: center;
              animation: backdropFadeIn 0.2s ease-out;
            }
            
            .confirmModal {
              background: var(--bg-modal-wrapper);
              backdrop-filter: blur(25px);
              border: 1px solid var(--border-strong);
              border-radius: 24px;
              padding: 28px 24px 24px 24px;
              width: 90%;
              max-width: 380px;
              box-shadow: var(--modal-shadow);
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              animation: modalScaleIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
              color: var(--text-primary);
            }
            
            .confirmIconWrapper {
              width: 56px;
              height: 56px;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 18px;
              transition: all 0.2s ease;
            }
            
            .confirmIcon {
              width: 28px;
              height: 28px;
            }
            
            .confirmIcon.danger {
              color: #f43f5e;
            }
            
            .confirmIconWrapper:has(.danger) {
              background: rgba(244, 63, 94, 0.1);
              border: 1px solid rgba(244, 63, 94, 0.15);
              box-shadow: 0 8px 20px rgba(244, 63, 94, 0.1);
            }
            
            .confirmIcon.warning {
              color: var(--accent-color);
            }
            
            .confirmIconWrapper:has(.warning) {
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.15);
              box-shadow: 0 8px 20px rgba(59, 130, 246, 0.1);
            }
            
            .confirmTitle {
              font-size: 19px;
              font-weight: 700;
              letter-spacing: -0.4px;
              margin: 0 0 10px 0;
              line-height: 1.25;
            }
            
            .confirmMsg {
              font-size: 14px;
              line-height: 1.5;
              color: var(--text-secondary);
              margin: 0 0 24px 0;
              word-break: break-word;
            }
            
            .confirmActions {
              display: flex;
              gap: 12px;
              width: 100%;
            }
            
            .confirmBtn {
              flex: 1;
              padding: 11px 16px;
              border-radius: 12px;
              font-size: 13.5px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
              font-family: inherit;
              box-sizing: border-box;
            }
            
            .cancelBtn {
              background: transparent;
              border: 1px solid var(--border-input);
              color: var(--text-secondary);
            }
            
            .cancelBtn:hover {
              background: var(--bg-item-hover);
              color: var(--text-primary);
              border-color: var(--border-tile-hover);
            }
            
            .actionBtn {
              background: var(--button-primary-bg);
              border: 1px solid var(--button-primary-bg);
              color: var(--button-primary-text);
              box-shadow: 0 4px 12px var(--button-primary-shadow);
            }
            
            .actionBtn:hover {
              opacity: 0.95;
              transform: translateY(-1px);
              box-shadow: 0 6px 16px var(--button-primary-shadow);
            }
            
            .actionBtn:active {
              transform: translateY(0);
            }
            
            .dangerBtn {
              background: #f43f5e;
              border-color: #f43f5e;
              color: #ffffff;
              box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
            }
            
            .dangerBtn:hover {
              background: #e11d48;
              border-color: #e11d48;
              box-shadow: 0 6px 16px rgba(244, 63, 94, 0.35);
            }
            
            @keyframes backdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes modalScaleIn {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(8px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
