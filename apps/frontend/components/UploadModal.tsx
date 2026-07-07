'use client';

import React, { useState, useRef } from 'react';
import { useCloud } from '../context/CloudContext';
import * as Icons from './Icons';
import { fmtBytes } from '../lib/utils';
import styles from './UploadModal.module.css';

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
    <div className={styles.modalBackdrop} onClick={handleClose}>
      <div className={`${styles.modalContent} ${styles.uploadModalContent}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('viewer.uploadFiles') || 'Tải tệp tin lên'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}><Icons.Close size={18} /></button>
        </div>

        <div className={styles.modalBody}>
          <form 
            className={`${styles.dragDropArea} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              onChange={handleChange} 
              style={{ display: 'none' }}
            />
            <div className={styles.uploadIcon}>
              <Icons.Upload size={48} />
            </div>
            <div className={styles.uploadTitle}>
              {t('viewer.dragDropPrompt') || 'Kéo & thả tệp tin vào đây hoặc click để duyệt tệp'}
            </div>
            <div className={styles.uploadSubtitle}>
              {t('viewer.maxSizeInfo') || 'Hỗ trợ tải lên cùng lúc nhiều tệp (ảnh, video, tài liệu)'}
            </div>
          </form>

          {/* Hiển thị danh sách file đã chọn */}
          {selectedFiles.length > 0 && (
            <div className={styles.selectedFilesSection}>
              <h4 className={styles.selectedFilesTitle}>
                {t('viewer.selectedFiles') || 'Tệp đã chọn'} ({selectedFiles.length})
              </h4>
              <div className={styles.selectedFilesList}>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className={styles.selectedFileRow}>
                    <div className={styles.fileMeta}>
                      <Icons.Folder size={16} className={styles.fileIcon} />
                      <span className={styles.fileName} title={file.name}>
                        {file.name}
                      </span>
                      <span className={styles.fileSize}>
                        ({fmtBytes(file.size)})
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className={styles.removeButton}
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
            <div className={styles.composerCheckboxContainer}>
              <label className={`${styles.saveToPersonalPostLabel} ${saveToPersonalGroupUpload ? styles.active : ''}`}>
                <input 
                  type="checkbox" 
                  checked={saveToPersonalGroupUpload} 
                  onChange={(e) => setSaveToPersonalGroupUpload(e.target.checked)} 
                  className={styles.hiddenCheckbox}
                />
                <span className={styles.customCheckbox}>
                  {saveToPersonalGroupUpload && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className={styles.checkboxText}>{t('sidebar.saveToPersonalCopy') || 'Đồng thời lưu một bản sao vào Không gian cá nhân'}</span>
              </label>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={handleClose}>{t('actions.cancel')}</button>
          <button 
            className={styles.primaryButton} 
            onClick={handleUploadSubmit}
            disabled={selectedFiles.length === 0}
          >
            {t('actions.upload') || 'Tải lên'}
          </button>
        </div>
      </div>
    </div>
  );
}
