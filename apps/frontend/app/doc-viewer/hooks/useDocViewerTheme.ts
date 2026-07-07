'use client';

import { useState, useEffect, useRef } from 'react';

export function useDocViewerTheme(globalTheme: 'light' | 'dark' | undefined) {
  const [docTheme, setDocTheme] = useState<'light' | 'dark'>('dark');
  const tabId = useRef('');

  useEffect(() => {
    tabId.current = Math.random().toString(36).substring(2, 9);

    const registerTab = () => {
      try {
        const activeTabs = JSON.parse(localStorage.getItem('docviewer_active_tabs') || '[]');
        if (!activeTabs.includes(tabId.current)) {
          activeTabs.push(tabId.current);
          localStorage.setItem('docviewer_active_tabs', JSON.stringify(activeTabs));
        }

        // Đọc theme đã lưu trước đó của các tab khác đang mở (nếu có)
        const savedTheme = localStorage.getItem('docviewer_theme') as 'light' | 'dark' | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setDocTheme(savedTheme);
        } else if (globalTheme === 'light' || globalTheme === 'dark') {
          setDocTheme(globalTheme);
          localStorage.setItem('docviewer_theme', globalTheme);
        }
      } catch (err) {
        console.error('Failed to register docviewer tab:', err);
      }
    };

    const unregisterTab = () => {
      try {
        const activeTabs = JSON.parse(localStorage.getItem('docviewer_active_tabs') || '[]');
        const updated = activeTabs.filter((id: string) => id !== tabId.current);
        if (updated.length === 0) {
          localStorage.removeItem('docviewer_active_tabs');
          localStorage.removeItem('docviewer_theme');
        } else {
          localStorage.setItem('docviewer_active_tabs', JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Failed to unregister docviewer tab:', err);
      }
    };

    registerTab();

    const handleUnload = () => {
      unregisterTab();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      unregisterTab();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [globalTheme]);

  // Chỉ nạp theme hệ thống (globalTheme) khi chưa có bất kỳ theme nào được lưu tạm thời
  useEffect(() => {
    if (globalTheme === 'light' || globalTheme === 'dark') {
      try {
        const savedTheme = localStorage.getItem('docviewer_theme');
        if (!savedTheme) {
          setDocTheme(globalTheme);
          localStorage.setItem('docviewer_theme', globalTheme);
        }
      } catch (err) {
        console.error('Failed to sync initial global theme:', err);
      }
    }
  }, [globalTheme]);

  // Ép buộc thuộc tính data-theme trên html tag luôn luôn khớp với docTheme (sử dụng MutationObserver)
  // Nhằm chặn việc ThemeProvider của Layout ghi đè thuộc tính khi theme hệ thống thay đổi từ tab khác
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', docTheme);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const current = document.documentElement.getAttribute('data-theme');
          if (current !== docTheme) {
            document.documentElement.setAttribute('data-theme', docTheme);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      observer.disconnect();
    };
  }, [docTheme]);

  // Sync temporary theme across docviewer tabs via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'docviewer_theme') {
        const val = e.newValue as 'light' | 'dark';
        if (val === 'light' || val === 'dark') {
          setDocTheme(val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleDocTheme = () => {
    const next = docTheme === 'light' ? 'dark' : 'light';
    setDocTheme(next);
    localStorage.setItem('docviewer_theme', next);
  };

  return { docTheme, toggleDocTheme };
}
