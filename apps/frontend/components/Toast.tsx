'use client';

import React, { useEffect, useState } from 'react';
import { ToastItem } from '../context/CloudContext';
import styles from './Toast.module.css';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps): React.JSX.Element {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;
    const exitDelay = duration - 300;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, exitDelay);

    const removeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onClose]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Block click propagation
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const handleToastClick = () => {
    if (toast.onClick) {
      toast.onClick();
    }
  };

  const typeClass = 
    toast.type === 'error' 
      ? styles.toastError 
      : toast.type === 'backend' 
        ? styles.toastBackend 
        : styles.toastInfo;

  return (
    <div 
      className={`${styles.toastItem} ${typeClass} ${isExiting ? styles.toastExiting : ''} ${toast.onClick ? styles.toastInteractable : ''}`}
      onClick={handleToastClick}
    >
      <span className={styles.toastIcon}>
        {toast.type === 'error' ? '✕' : toast.type === 'backend' ? '🔔' : '✓'}
      </span>
      <div className={styles.toastContent}>
        {toast.title && <div className={styles.toastTitle}>{toast.title}</div>}
        <span className={styles.toastMsg}>{toast.message}</span>
      </div>
      <button className={styles.toastCloseBtn} onClick={handleClose}>
        ✕
      </button>
    </div>
  );
}
