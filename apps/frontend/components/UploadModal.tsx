'use client';

import React, { useState, useRef } from 'react';
import { useCloud } from '../context/CloudContext';
import * as Icons from './Icons';
import { fmtBytes } from '../lib/utils';

export default function UploadModal(): React.JSX.Element | null {
  const {
    showUploadModal,
    setShowUploadModal,
    uploadFiles,
    activeWorkspace,
    saveToPersonalGroupUpload,
    setSaveToPersonalGroupUpload,
    t
  } = useCloud();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showUploadModal) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setShowUploadModal(false);
    await uploadFiles(selectedFiles);
    setSelectedFiles([]);
  };

  const handleClose = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
  };

  const isGroup = activeWorkspace.type === 'group';

  return (
    <div className="modalBackdrop" onClick={handleClose}>
      <div className="modalContent uploadModalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>{t('viewer.uploadFiles') || 'Tải tệp tin lên'}</h2>
          <button className="closeBtn" onClick={handleClose}><Icons.Close size={18} /></button>
        </div>

        <div className="modalBody">
          <form 
            className={`dragDropArea ${dragActive ? 'dragActive' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
              borderColor: dragActive ? 'var(--button-primary-bg)' : 'var(--border-color)',
              transition: 'all 0.25s ease',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              onChange={handleChange} 
              style={{ display: 'none' }}
            />
            <div className="uploadIcon" style={{ color: dragActive ? 'var(--button-primary-bg)' : 'var(--text-muted)' }}>
              <Icons.Upload size={48} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('viewer.dragDropPrompt') || 'Kéo & thả tệp tin vào đây hoặc click để duyệt tệp'}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              {t('viewer.maxSizeInfo') || 'Hỗ trợ tải lên cùng lúc nhiều tệp (ảnh, video, tài liệu)'}
            </div>
          </form>

          {/* Hiển thị danh sách file đã chọn */}
          {selectedFiles.length > 0 && (
            <div className="selectedFilesSection" style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '13.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {t('viewer.selectedFiles') || 'Tệp đã chọn'} ({selectedFiles.length})
              </h4>
              <div 
                className="selectedFilesList" 
                style={{ 
                  maxHeight: '180px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-input)'
                }}
              >
                {selectedFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="selectedFileRow"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: idx < selectedFiles.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, paddingRight: '12px' }}>
                      <Icons.Folder size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="fileName" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                        {file.name}
                      </span>
                      <span className="fileSize" style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>
                        ({fmtBytes(file.size)})
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: 'rgba(239, 68, 68, 0.8)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Icons.Close size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checkbox lưu copy vào personal trong group workspace */}
          {isGroup && (
            <label 
              className="checkboxLabel" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '13.5px', 
                cursor: 'pointer',
                margin: '8px 4px 16px 4px',
                color: 'var(--text-primary)'
              }}
            >
              <input 
                type="checkbox" 
                checked={saveToPersonalGroupUpload} 
                onChange={(e) => setSaveToPersonalGroupUpload(e.target.checked)} 
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  cursor: 'pointer'
                }}
              />
              <span>{t('sidebar.saveToPersonalCopy') || 'Đồng thời lưu một bản sao vào Không gian cá nhân'}</span>
            </label>
          )}
        </div>

        <div className="modalFooter">
          <button className="secondary" onClick={handleClose}>{t('actions.cancel')}</button>
          <button 
            className="primary" 
            onClick={handleUploadSubmit}
            disabled={selectedFiles.length === 0}
            style={{
              opacity: selectedFiles.length === 0 ? 0.5 : 1,
              cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {t('actions.upload') || 'Tải lên'}
          </button>
        </div>
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
          max-width: 500px;
          box-shadow: var(--modal-shadow);
          box-sizing: border-box;
          animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: var(--text-primary);
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
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
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .closeBtn:hover {
          color: var(--text-primary);
        }
        .modalBody {
          display: flex;
          flex-direction: column;
        }
        .modalFooter {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        button.secondary {
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
        button.secondary:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
        }
        button.primary {
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
        button.primary:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        button.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .dragDropArea:hover {
          background: rgba(99, 102, 241, 0.03) !important;
          border-color: var(--button-primary-bg) !important;
        }

        /* custom scrollbar for file list */
        .selectedFilesList::-webkit-scrollbar {
          width: 6px;
        }
        .selectedFilesList::-webkit-scrollbar-track {
          background: transparent;
        }
        .selectedFilesList::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .selectedFilesList::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
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
