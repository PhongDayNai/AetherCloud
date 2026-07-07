'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'error' | 'backend';
  title?: string;
  duration?: number;
  onClick?: () => void;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (
    message: string,
    type?: 'info' | 'error' | 'backend',
    options?: { title?: string; duration?: number; onClick?: () => void }
  ) => void;
  removeToast: (id: string) => void;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  err: string;
  setErr: React.Dispatch<React.SetStateAction<string>>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const addToast = useCallback((
    message: string,
    type: 'info' | 'error' | 'backend' = 'info',
    options?: { title?: string; duration?: number; onClick?: () => void }
  ) => {
    const newToast: ToastItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      message,
      type,
      ...options
    };
    if (type === 'backend') {
      setToastQueue((prev) => [newToast, ...prev]);
    } else {
      setToastQueue((prev) => [...prev, newToast]);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toastQueue.length > 0 && toasts.length < 3) {
      const backendIndex = toastQueue.findIndex(t => t.type === 'backend');
      let nextToast: ToastItem;
      if (backendIndex !== -1) {
        nextToast = toastQueue[backendIndex];
        setToastQueue((prev) => prev.filter((_, idx) => idx !== backendIndex));
      } else {
        nextToast = toastQueue[0];
        setToastQueue((prev) => prev.slice(1));
      }
      setToasts((prev) => [...prev, nextToast]);
    }
  }, [toastQueue, toasts]);

  useEffect(() => {
    if (msg) {
      addToast(msg, 'info');
      setMsg('');
    }
  }, [msg, addToast]);

  useEffect(() => {
    if (err) {
      addToast(err, 'error');
      setErr('');
    }
  }, [err, addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, msg, setMsg, err, setErr }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
