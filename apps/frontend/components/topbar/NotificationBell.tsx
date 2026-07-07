'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNotification, NotificationItem } from '../../context/NotificationContext';
import { useCloud } from '../../context/CloudContext';
import styles from '../Topbar.module.css';
import { NotificationIcon } from '../Icons';

interface NotificationBellProps {
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function NotificationBell({ t }: NotificationBellProps): React.JSX.Element {
  const { loadData } = useCloud();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    acceptInvite, 
    declineInvite 
  } = useNotification();

  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffMins < 1) return t('notifications.justNow') || 'Vừa xong';
      if (diffMins < 60) return `${diffMins} ${t('notifications.minsAgo') || 'phút trước'}`;
      if (diffHours < 24) return `${diffHours} ${t('notifications.hoursAgo') || 'giờ trước'}`;
      if (diffDays < 30) return `${diffDays} ${t('notifications.daysAgo') || 'ngày trước'}`;
      return past.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const getNotificationText = (item: NotificationItem) => {
    const meta = item.metadata || {};
    const getRoleLabel = (r: string) => {
      if (r === 'admin') return t('profile.admin') || 'Quản trị viên';
      if (r === 'member') return t('profile.member') || 'Thành viên';
      return r;
    };

    switch (item.type) {
      case 'group_invite':
        return {
          title: t('notifications.type.group_invite') || 'Lời mời tham gia nhóm',
          content: t('notifications.type.group_invite.desc', {
            senderName: meta.senderName || 'Ai đó',
            groupName: meta.groupName || 'Nhóm',
            role: getRoleLabel(meta.role || 'member')
          }) || `${meta.senderName || 'Ai đó'} đã mời bạn tham gia nhóm "${meta.groupName || 'Nhóm'}" với vai trò ${getRoleLabel(meta.role || 'member')}.`
        };
      case 'group_join':
        return {
          title: t('notifications.type.group_join') || 'Thành viên mới gia nhập',
          content: t('notifications.type.group_join.desc', {
            joinerName: meta.joinerName || 'Thành viên',
            groupName: meta.groupName || 'Nhóm'
          }) || `Người dùng ${meta.joinerName || 'Thành viên'} đã tham gia vào nhóm "${meta.groupName || 'Nhóm'}" qua mã mời.`
        };
      case 'group_leave':
        return {
          title: t('notifications.type.group_leave') || 'Thành viên rời nhóm',
          content: t('notifications.type.group_leave.desc', {
            userName: meta.userName || 'Thành viên',
            groupName: meta.groupName || 'Nhóm'
          }) || `Người dùng ${meta.userName || 'Thành viên'} đã rời khỏi nhóm "${meta.groupName || 'Nhóm'}".`
        };
      case 'group_kick':
        return {
          title: t('notifications.type.group_kick') || 'Thông báo từ nhóm',
          content: t('notifications.type.group_kick.desc', {
            groupName: meta.groupName || 'Nhóm'
          }) || `Bạn đã bị trục xuất khỏi nhóm "${meta.groupName || 'Nhóm'}".`
        };
      case 'group_role_update':
        return {
          title: t('notifications.type.group_role_update') || 'Cập nhật chức vụ',
          content: t('notifications.type.group_role_update.desc', {
            groupName: meta.groupName || 'Nhóm',
            role: getRoleLabel(meta.role || 'member')
          }) || `Chức vụ của bạn trong nhóm "${meta.groupName || 'Nhóm'}" đã được cập nhật thành ${getRoleLabel(meta.role || 'member')}.`
        };
      case 'group_owner_transfer':
        return {
          title: t('notifications.type.group_owner_transfer') || 'Nhượng chức Chủ nhóm',
          content: t('notifications.type.group_owner_transfer.desc', {
            groupName: meta.groupName || 'Nhóm',
            newOwnerName: meta.newOwnerName || 'Chủ sở hữu mới'
          }) || `Quyền Chủ sở hữu nhóm "${meta.groupName || 'Nhóm'}" đã được chuyển nhượng cho ${meta.newOwnerName || 'Chủ sở hữu mới'}.`
        };
      default:
        return {
          title: item.title,
          content: item.content
        };
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    if (item.type === 'group_invite' && item.metadata?.token) {
      window.location.href = `/invite/group?code=${item.metadata.token}`;
    }
    setShowPopover(false);
  };

  const handleAcceptInvite = async (nId: string, token: string) => {
    setActionLoadingId(nId);
    try {
      await acceptInvite(token, nId);
      await markAsRead(nId);
      loadData(true);
    } catch (err: any) {
      alert(err.message || 'Gia nhập nhóm thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvite = async (nId: string, token: string) => {
    setActionLoadingId(nId);
    try {
      await declineInvite(token, nId);
      await markAsRead(nId);
    } catch (err: any) {
      alert(err.message || 'Từ chối thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className={styles.notificationBellContainer} ref={popoverRef}>
      <button 
        className={`${styles.bellButton} ${showPopover ? styles.active : ''}`} 
        onClick={() => setShowPopover(!showPopover)}
        title={t('notifications.title') || 'Thông báo'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`${styles.bellIcon} ${unreadCount > 0 ? styles.ringing : ''}`}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.bellBadge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover */}
      <div className={`${styles.notificationsPopover} ${showPopover ? styles.visible : ''}`}>
        <div className={styles.popoverHeader}>
          <h3>{t('notifications.title') || 'Thông báo'}</h3>
          {unreadCount > 0 && (
            <button className={styles.markAllRead} onClick={markAllAsRead}>
              {t('notifications.markAllRead') || 'Đọc tất cả'}
            </button>
          )}
        </div>

        <div className={`${styles.popoverBody} ${styles.customScrollbar}`}>
          {notifications.length === 0 ? (
            <div className={styles.popoverEmpty}>
              <div className={styles.emptyIcon}>📭</div>
              <p>{t('notifications.empty') || 'Không có thông báo nào'}</p>
            </div>
          ) : (
            notifications.map((item) => {
              const text = getNotificationText(item);
              return (
                <div 
                  key={item.id} 
                  className={`${styles.notificationItem} ${item.is_read ? styles.read : styles.unread}`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className={`${styles.notificationIconWrapper} ${styles[item.type] || styles.system}`}>
                    <NotificationIcon type={item.type} />
                  </div>

                  <div className={styles.notificationItemContent}>
                    <div className={styles.notificationHeaderRow}>
                      <h4 className={styles.notificationItemTitle}>{text.title}</h4>
                      <span className={styles.notificationTime}>{formatRelativeTime(item.created_at)}</span>
                    </div>
                    <p className={styles.notificationItemText}>{text.content}</p>

                    {item.type === 'group_invite' && item.metadata?.token && (() => {
                      const isExpired = item.metadata.expiresAt ? new Date(item.metadata.expiresAt) < new Date() : false;
                      return (
                        <div className={styles.notificationInviteActions} onClick={(e) => e.stopPropagation()}>
                          {item.metadata.status === 'accepted' ? (
                            <span className={`${styles.inviteStatusText} ${styles.accepted}`}>✓ {t('invite.statusAccepted') || 'Đã chấp nhận'}</span>
                          ) : item.metadata.status === 'declined' ? (
                            <span className={`${styles.inviteStatusText} ${styles.declined}`}>✕ {t('invite.statusDeclined') || 'Đã từ chối'}</span>
                          ) : isExpired ? (
                            <span className={`${styles.inviteStatusText} ${styles.declined}`}>✕ {t('invite.statusExpired') || 'Đã hết hạn'}</span>
                          ) : (
                            <>
                              <button 
                                className={`${styles.inviteBtn} ${styles.accept}`} 
                                onClick={() => handleAcceptInvite(item.id, item.metadata.token)}
                                disabled={actionLoadingId !== null}
                              >
                                {actionLoadingId === item.id ? '...' : (t('notifications.accept') || 'Đồng ý')}
                              </button>
                              <button 
                                className={`${styles.inviteBtn} ${styles.decline}`} 
                                onClick={() => handleDeclineInvite(item.id, item.metadata.token)}
                                disabled={actionLoadingId !== null}
                              >
                                {actionLoadingId === item.id ? '...' : (t('notifications.decline') || 'Từ chối')}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                
                  <button 
                    className={styles.notificationItemDelete} 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    title={t('actions.delete') || 'Xóa'}
                  >
                    &times;
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
