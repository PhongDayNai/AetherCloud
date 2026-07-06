'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCloud } from '../context/CloudContext';
import { useNotification, NotificationItem } from '../context/NotificationContext';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  search: string;
  setSearch: (search: string) => void;
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  collectionView: string;
  docCollectionView: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addSelectedToAlbum: () => void;
  addSelectedToDocProject: () => void;
  moveSelectedToTrash: () => void;
  restoreSelectedFromTrash: () => void;
  purgeSelectedForever: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function Topbar({
  search,
  setSearch,
  selectionMode,
  setSelectionMode,
  selectedIds,
  setSelectedIds,
  tab,
  collectionView,
  docCollectionView,
  onUpload,
  addSelectedToAlbum,
  addSelectedToDocProject,
  moveSelectedToTrash,
  restoreSelectedFromTrash,
  purgeSelectedForever,
  t
}: TopbarProps): React.JSX.Element {
  const { activeWorkspace, setShowBulkShareModal, setShowUploadModal, loadData } = useCloud();
  const router = useRouter();
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

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Định dạng thời gian tương đối đơn giản
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
      const result = await acceptInvite(token, nId);
      // Đánh dấu đã đọc thông báo mời này
      await markAsRead(nId);
      // Reload lại data groups ở CloudContext
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
    <header className="topbar">
      <input 
        className="search" 
        placeholder={t('topbar.searchPlaceholder')} 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
      />

      <div className="actions">
        <div className="uploadBtn" onClick={() => setShowUploadModal(true)} style={{ userSelect: 'none' }}>
          {t('actions.upload')}
        </div>

        <button className="ghost" onClick={() => { setSelectionMode((v) => !v); if (selectionMode) setSelectedIds([]); }}>
          {selectionMode ? t('actions.exitSelect', { count: selectedIds.length }) : t('actions.selectMultiple')}
        </button>

        {selectionMode && selectedIds.length > 0 && (
          <>
            {(tab === 'photos' && collectionView !== 'trash') || 
             (tab === 'docs' && docCollectionView !== 'trash') ||
             (tab === 'spaces' && collectionView !== 'trash') ? (
              <>
                {tab === 'photos' && <button className="ghost" onClick={addSelectedToAlbum}>{t('actions.addToAlbum')}</button>}
                {tab === 'docs' && <button className="ghost" onClick={addSelectedToDocProject}>{t('actions.addToProject')}</button>}
                
                {activeWorkspace.type === 'personal' && tab !== 'spaces' && (
                  <button className="ghost" onClick={() => setShowBulkShareModal(true)}>
                    {t('actions.shareToGroup') || 'Chia sẻ vào Nhóm'}
                  </button>
                )}
                
                <button className="danger" onClick={moveSelectedToTrash}>{t('actions.delete')}</button>
              </>
            ) : (
              <>
                <button className="ghost" onClick={restoreSelectedFromTrash}>{t('actions.restore')}</button>
                <button className="danger" onClick={purgeSelectedForever}>{t('actions.deleteForever')}</button>
              </>
            )}
          </>
        )}

        {/* Quả chuông Thông báo Realtime */}
        <div className="notification-bell-container" ref={popoverRef}>
          <button 
            className={`bell-button ${showPopover ? 'active' : ''}`} 
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
              className={`bell-icon ${unreadCount > 0 ? 'ringing' : ''}`}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="bell-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Popover chứa danh sách thông báo */}
          <div className={`notifications-popover ${showPopover ? 'visible' : ''}`}>
            <div className="popover-header">
              <h3>{t('notifications.title') || 'Thông báo'}</h3>
              {unreadCount > 0 && (
                <button className="mark-all-read" onClick={markAllAsRead}>
                  {t('notifications.markAllRead') || 'Đọc tất cả'}
                </button>
              )}
            </div>

            <div className="popover-body custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="popover-empty">
                  <div className="empty-icon">📭</div>
                  <p>{t('notifications.empty') || 'Không có thông báo nào'}</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const text = getNotificationText(item);
                  return (
                    <div 
                      key={item.id} 
                      className={`notification-item ${item.is_read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className="notification-item-content">
                        <div className="notification-meta-row">
                          <span className={`type-tag ${item.type}`}>
                            {item.type === 'group_invite' && '✉️'}
                            {item.type === 'group_join' && '🤝'}
                            {item.type === 'group_leave' && '🚪'}
                            {item.type === 'group_kick' && '👢'}
                            {item.type === 'group_role_update' && '🎖️'}
                            {item.type === 'group_owner_transfer' && '👑'}
                            {item.type === 'system' && '⚙️'}
                          </span>
                          <span className="notification-time">{formatRelativeTime(item.created_at)}</span>
                        </div>
                        <h4 className="notification-item-title">{text.title}</h4>
                        <p className="notification-item-text">{text.content}</p>

                        {/* Các nút tương tác lời mời nhóm */}
                        {item.type === 'group_invite' && item.metadata?.token && (() => {
                          const isExpired = item.metadata.expiresAt ? new Date(item.metadata.expiresAt) < new Date() : false;
                          return (
                            <div className="notification-invite-actions" onClick={(e) => e.stopPropagation()}>
                              {item.metadata.status === 'accepted' ? (
                                <span className="invite-status-text accepted">✓ {t('invite.statusAccepted') || 'Đã chấp nhận'}</span>
                              ) : item.metadata.status === 'declined' ? (
                                <span className="invite-status-text declined">✕ {t('invite.statusDeclined') || 'Đã từ chối'}</span>
                              ) : isExpired ? (
                                <span className="invite-status-text declined">✕ {t('invite.statusExpired') || 'Đã hết hạn'}</span>
                              ) : (
                                <>
                                  <button 
                                    className="invite-btn accept" 
                                    onClick={() => handleAcceptInvite(item.id, item.metadata.token)}
                                    disabled={actionLoadingId !== null}
                                  >
                                    {actionLoadingId === item.id ? '...' : (t('notifications.accept') || 'Đồng ý')}
                                  </button>
                                  <button 
                                    className="invite-btn decline" 
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
                      className="notification-item-delete" 
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
      </div>

      <style jsx>{`
        .topbar {
          display: flex;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 38px;
          position: sticky;
          top: 16px;
          z-index: 100;
          background: var(--bg-sidebar);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-strong);
          border-radius: 20px;
          padding: 10px 14px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .search {
          flex: 1;
          max-width: 600px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .search:focus {
          background: var(--bg-input-focus);
          border-color: var(--border-input-focus);
          box-shadow: 0 0 0 1px var(--border-color);
        }
        .search::placeholder {
          color: var(--text-muted);
        }
        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .uploadBtn {
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          border-radius: 12px;
          padding: 10px 18px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: 0;
          box-shadow: 0 4px 14px var(--button-primary-shadow);
          display: inline-block;
        }
        .uploadBtn:hover {
          transform: translateY(-1px);
          background: var(--button-primary-hover);
          box-shadow: 0 6px 20px var(--button-primary-hover-shadow);
        }
        .ghost {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          border-radius: 12px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .ghost:hover {
          background: var(--bg-item-active);
          border-color: var(--border-input-focus);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
        .danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border-radius: 12px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.35);
          color: #ffffff;
          transform: translateY(-1px);
        }

        /* Quả chuông Thông báo */
        .notification-bell-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .bell-button {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          border-radius: 12px;
          padding: 9px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .bell-button:hover, .bell-button.active {
          background: var(--bg-item-active);
          border-color: var(--border-input-focus);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
        .bell-icon {
          width: 20px;
          height: 20px;
        }
        .bell-icon.ringing {
          animation: bellWobble 1s ease infinite alternate;
        }
        .bell-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          border-radius: 99px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
          border: 2px solid var(--bg-page, #09090b);
        }

        /* Notifications Popover */
        .notifications-popover {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 340px;
          background: var(--bg-popover, #18181b);
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.08));
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
          border-radius: 16px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: top right;
          opacity: 0;
          transform: translateY(8px) scale(0.95);
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .notifications-popover.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid var(--popover-divider, #27272a);
        }
        .popover-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .mark-all-read {
          background: none;
          border: none;
          color: var(--accent-color, #3b82f6);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .mark-all-read:hover {
          background: rgba(59, 130, 246, 0.1);
        }
        .popover-body {
          max-height: 380px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .popover-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-muted);
          text-align: center;
        }
        .empty-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .popover-empty p {
          margin: 0;
          font-size: 13px;
        }

        /* Notification Item */
        .notification-item {
          display: flex;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--popover-divider, #27272a);
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
        }
        .notification-item:last-child {
          border-bottom: none;
        }
        .notification-item.unread {
          background: rgba(255, 255, 255, 0.02);
        }
        .notification-item.unread::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 99px;
          background: var(--accent-color, #3b82f6);
        }
        .notification-item:hover {
          background: var(--bg-item-hover);
        }
        .notification-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .notification-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }
        .type-tag {
          font-size: 12px;
        }
        .notification-time {
          color: var(--text-muted);
        }
        .notification-item-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .notification-item-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          word-break: break-word;
        }
        .notification-item-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 18px;
          cursor: pointer;
          opacity: 0;
          padding: 0 4px;
          align-self: flex-start;
          transition: all 0.2s;
        }
        .notification-item:hover .notification-item-delete {
          opacity: 1;
        }
        .notification-item-delete:hover {
          color: #ef4444;
        }

        /* Nút tương tác lời mời nhóm */
        .notification-invite-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .invite-btn {
          flex: 1;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .invite-btn.accept {
          background: var(--accent-color, #3b82f6);
          color: #ffffff;
        }
        .invite-btn.accept:hover {
          background: var(--accent-color-hover, #1d4ed8);
        }
        .invite-btn.decline {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
        }
        .invite-btn.decline:hover {
          background: var(--bg-item-active);
          color: var(--text-primary);
        }
        .invite-status-text {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
        }
        .invite-status-text.accepted {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .invite-status-text.declined {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-input);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* Keyframes */
        @keyframes bellWobble {
          0% { transform: rotate(0); }
          15% { transform: rotate(8deg); }
          30% { transform: rotate(-8deg); }
          45% { transform: rotate(4deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(2deg); }
          100% { transform: rotate(0); }
        }
      `}</style>
    </header>
  );
}
