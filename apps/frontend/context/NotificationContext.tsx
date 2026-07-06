'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getApiOrigin } from '../lib/utils';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'group_join' | 'group_invite' | 'group_leave' | 'system' | 'group_kick' | 'group_role_update' | 'group_owner_transfer';
  is_read: boolean;
  created_at: string;
  metadata: any;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<boolean>;
  acceptInvite: (token: string, notificationId?: string) => Promise<{ success: boolean; groupId: string; groupName: string }>;
  declineInvite: (token: string, notificationId?: string) => Promise<{ success: boolean; groupId: string }>;
  toasts: Array<{ id: string; message: string; title: string; type: string }>;
  removeToast: (id: string) => void;
  addNotificationToast: (title: string, message: string) => void;
  registerToastListener: (listener: (message: string, type: 'info' | 'error' | 'backend', options?: { title?: string; duration?: number; onClick?: () => void }) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; title: string; type: string }>>([]);
  
  const apiOrigin = getApiOrigin();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const toastListenerRef = useRef<((message: string, type: 'info' | 'error' | 'backend', options?: { title?: string; duration?: number; onClick?: () => void }) => void) | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  const registerToastListener = useCallback((listener: (message: string, type: 'info' | 'error' | 'backend', options?: { title?: string; duration?: number; onClick?: () => void }) => void) => {
    toastListenerRef.current = listener;
  }, []);

  const addNotificationToast = useCallback((title: string, message: string, type: string = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Tự động đóng toast sau 5 giây
    setTimeout(() => {
      if (isMountedRef.current) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. GET danh sách thông báo
  const fetchNotifications = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiOrigin}/api/notifications`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const list = data.notifications || [];
          setNotifications(list);
          setUnreadCount(list.filter((n: NotificationItem) => !n.is_read).length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiOrigin]);

  // 2. PUT đánh dấu đã đọc
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiOrigin}/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  }, [apiOrigin]);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    
    // Gọi tuần tự hoặc song song các API
    await Promise.all(unreadIds.map((id) => markAsRead(id)));
  }, [notifications, markAsRead]);

  // 3. DELETE xóa thông báo
  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiOrigin}/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        const target = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete notification:', err);
      return false;
    }
  }, [apiOrigin, notifications]);

  // 4. POST Chấp nhận lời mời gia nhập nhóm
  const acceptInvite = useCallback(async (token: string, notificationId?: string): Promise<{ success: boolean; groupId: string; groupName: string }> => {
    try {
      const res = await fetch(`${apiOrigin}/api/groups/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Cập nhật state local ngay lập tức để đồng bộ UI
        setNotifications((prev) => 
          prev.map((n) => {
            if (notificationId && n.id === notificationId) {
              return { ...n, is_read: true, metadata: { ...n.metadata, status: 'accepted' } };
            }
            if (!notificationId && n.metadata?.token === token) {
              return { ...n, is_read: true, metadata: { ...n.metadata, status: 'accepted' } };
            }
            return n;
          })
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        fetchNotifications();
        return { success: true, groupId: data.groupId, groupName: data.groupName };
      }
      throw new Error(data.message || 'Gia nhập nhóm thất bại');
    } catch (err: any) {
      console.error('Accept invite error:', err.message);
      fetchNotifications();
      throw err;
    }
  }, [apiOrigin, fetchNotifications]);

  // 5. POST Từ chối lời mời gia nhập nhóm
  const declineInvite = useCallback(async (token: string, notificationId?: string): Promise<{ success: boolean; groupId: string }> => {
    try {
      const res = await fetch(`${apiOrigin}/api/groups/invitations/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Cập nhật state local ngay lập tức để đồng bộ UI
        setNotifications((prev) => 
          prev.map((n) => {
            if (notificationId && n.id === notificationId) {
              return { ...n, is_read: true, metadata: { ...n.metadata, status: 'declined' } };
            }
            if (!notificationId && n.metadata?.token === token) {
              return { ...n, is_read: true, metadata: { ...n.metadata, status: 'declined' } };
            }
            return n;
          })
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        fetchNotifications();
        return { success: true, groupId: data.groupId };
      }
      throw new Error(data.message || 'Từ chối lời mời thất bại');
    } catch (err: any) {
      console.error('Decline invite error:', err.message);
      fetchNotifications();
      throw err;
    }
  }, [apiOrigin, fetchNotifications]);

  // 6. Kết nối WebSocket realtime nhận thông báo
  const connectWebSocket = useCallback(async () => {
    if (socketRef.current || isConnectingRef.current || !isMountedRef.current) return;
    isConnectingRef.current = true;

    try {
      // Lấy token dùng cho WebSocket (vì WebSocket client của trình duyệt không hỗ trợ CORS credentials)
      const tokenRes = await fetch(`${apiOrigin}/api/auth/token`, { credentials: 'include' });
      if (!tokenRes.ok) {
        throw new Error('Failed to retrieve WebSocket authorization token');
      }
      const tokenData = await tokenRes.json();
      const token = tokenData.token;
      if (!token || !isMountedRef.current) return;

      // Chuyển đổi http(s) origin sang ws(s) origin
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsHost = window.location.host;
      let wsUrl = '';
      
      // Tự động khớp đường dẫn WebSocket (/api/ws hoặc /ws) dựa trên cấu trúc API Origin
      const wsPath = apiOrigin.includes('/api') ? '/api/ws' : '/ws';
      
      if (apiOrigin.startsWith('http')) {
        const urlObj = new URL(apiOrigin);
        const proto = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
        wsHost = urlObj.host;
        wsUrl = `${proto}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;
      } else {
        wsUrl = `${wsProto}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;
      }

      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('[WebSocket] Realtime notification channel connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'notification_deleted') {
            const deletedId = message.data?.id;
            if (deletedId) {
              setNotifications((prev) => {
                const target = prev.find((n) => n.id === deletedId);
                const newList = prev.filter((n) => n.id !== deletedId);
                if (target && !target.is_read) {
                  setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
                }
                return newList;
              });
            }
          }

          if (message.type === 'group_invite_declined') {
            const { groupId } = message.data || {};
            if (typeof window !== 'undefined' && groupId) {
              window.dispatchEvent(
                new CustomEvent('group-update', {
                  detail: {
                    type: 'group_invite_declined',
                    metadata: { groupId }
                  }
                })
              );
            }
          }

          if (message.type === 'notification') {
            const newNotification = message.data as NotificationItem;
            
            // Dispatch event toàn cục báo cập nhật thông tin nhóm (realtime reload)
            if (typeof window !== 'undefined' && newNotification.type && newNotification.type.startsWith('group_')) {
              window.dispatchEvent(
                new CustomEvent('group-update', {
                  detail: {
                    type: newNotification.type,
                    metadata: newNotification.metadata
                  }
                })
              );
            }

            setNotifications((prev) => {
              // Tránh trùng lặp tin nhắn
              if (prev.some((n) => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev];
            });
            
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }

            // Hiển thị Toast thông báo realtime
            if (toastListenerRef.current) {
              toastListenerRef.current(newNotification.content, 'backend', {
                title: newNotification.title,
                duration: 10000,
                onClick: () => {
                  if (newNotification.type === 'group_invite' && newNotification.metadata?.token) {
                    window.location.href = `/invite/group?code=${newNotification.metadata.token}`;
                  }
                  markAsRead(newNotification.id);
                }
              });
            } else {
              addNotificationToast(newNotification.title, newNotification.content);
            }
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message frame:', err);
        }
      };

      socketRef.current.onclose = (event) => {
        socketRef.current = null;
        if (isMountedRef.current && event.code !== 1000) {
          console.log('[WebSocket] Connection closed. Reconnecting in 5s...');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
      };

      socketRef.current.onerror = () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    } catch (err) {
      console.warn('[WebSocket] Auth or connection error:', err);
    } finally {
      isConnectingRef.current = false;
    }
  }, [apiOrigin, addNotificationToast, markAsRead]);

  // Hủy kết nối
  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close(1000, 'Normal closure');
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Khởi động kết nối khi mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Gọi fetch lần đầu và kết nối WebSocket nếu đã đăng nhập (kiểm tra gián tiếp bằng API)
    const initNotifications = async () => {
      try {
        const res = await fetch(`${apiOrigin}/api/notifications`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setNotifications(data.notifications || []);
            setUnreadCount((data.notifications || []).filter((n: NotificationItem) => !n.is_read).length);
            connectWebSocket();
          }
        }
      } catch (e) {
        // Chưa đăng nhập hoặc lỗi kết nối, không chạy WebSocket
      }
    };

    initNotifications();

    return () => {
      isMountedRef.current = false;
      disconnectWebSocket();
    };
  }, [apiOrigin, connectWebSocket, disconnectWebSocket]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        acceptInvite,
        declineInvite,
        toasts,
        removeToast,
        addNotificationToast,
        registerToastListener
      }}
    >
      {children}

      {/* Global Realtime Notification Toasts Container */}
      <div className="notification-toasts-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="notification-toast show">
            <div className="notification-toast-header">
              <span className="notification-toast-icon">🔔</span>
              <strong className="notification-toast-title">{toast.title}</strong>
              <button 
                className="notification-toast-close" 
                onClick={() => removeToast(toast.id)}
              >
                &times;
              </button>
            </div>
            <div className="notification-toast-body">{toast.message}</div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .notification-toasts-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 360px;
            width: 100%;
            pointer-events: none;
          }
          .notification-toast {
            background: var(--bg-popover, #18181b);
            border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.08));
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
            border-radius: 12px;
            padding: 14px 16px;
            color: var(--text-primary, #fff);
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
            transform: translateY(20px) scale(0.95);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .notification-toast.show {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          .notification-toast-header {
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
          }
          .notification-toast-icon {
            font-size: 16px;
            animation: bellRing 1.5s ease infinite alternate;
          }
          .notification-toast-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary, #fff);
            padding-right: 20px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .notification-toast-close {
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-muted, #71717a);
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            line-height: 1;
            transition: color 0.2s;
          }
          .notification-toast-close:hover {
            color: var(--text-primary, #fff);
          }
          .notification-toast-body {
            font-size: 13px;
            color: var(--text-secondary, #a1a1aa);
            line-height: 1.4;
            word-break: break-word;
          }
          
          @keyframes bellRing {
            0% { transform: rotate(0); }
            15% { transform: rotate(15deg); }
            30% { transform: rotate(-15deg); }
            45% { transform: rotate(10deg); }
            60% { transform: rotate(-10deg); }
            75% { transform: rotate(4deg); }
            100% { transform: rotate(0); }
          }
        `
      }} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
