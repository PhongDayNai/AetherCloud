'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCloud } from '../context/CloudContext';
import { useConfirm } from '../context/ConfirmContext';
import * as Icons from './Icons';
import CustomSelect from './CustomSelect';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: { id: string; name: string; role: 'owner' | 'admin' | 'member' } | null;
}

export default function GroupSettingsModal({
  isOpen,
  onClose,
  group
}: GroupSettingsModalProps): React.JSX.Element | null {
  const { t } = useLanguage();
  const { api, user, addToast, loadData } = useCloud();
  const confirm = useConfirm();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Lấy vai trò của người dùng hiện tại trong nhóm này
  const myRole = group?.role || 'member';

  const fetchMembers = async () => {
    if (!group) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/members`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Sắp xếp thứ tự: Owner -> Admin -> Member
        const sorted = (data.members || []).sort((a: any, b: any) => {
          const roleWeights = { owner: 3, admin: 2, member: 1 };
          const wA = roleWeights[a.role as keyof typeof roleWeights] || 0;
          const wB = roleWeights[b.role as keyof typeof roleWeights] || 0;
          return wB - wA;
        });
        setMembers(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && group) {
      setInviteEmail('');
      setInviteRole('member');
      setErrorMsg('');
      fetchMembers();
    }
  }, [isOpen, group]);

  if (!isOpen || !group) return null;

  // 1. Mời thành viên mới
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setErrorMsg('');
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/members`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.inviteFailed') || 'Mời thành viên thất bại');
      }
      addToast(t('groups.inviteSuccess') || 'Gửi lời mời thành công!', 'info');
      setInviteEmail('');
      fetchMembers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 2. Thăng cấp / Hạ cấp vai trò
  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/members/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.promoteFailed'));
      }
      const msgKey = newRole === 'admin' ? 'groups.promoteSuccess' : 'groups.demoteSuccess';
      addToast(t(msgKey) || 'Cập nhật chức vụ thành công', 'info');
      fetchMembers();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Trục xuất thành viên
  const handleKick = async (userId: string) => {
    if (!await confirm(t('groups.confirmKick') || 'Bạn có chắc chắn muốn trục xuất thành viên này?', { isDanger: true })) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.kickFailed'));
      }
      addToast(t('groups.kickSuccess') || 'Đã trục xuất thành viên', 'info');
      fetchMembers();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Nhượng quyền Owner
  const handleTransferOwnership = async (userId: string) => {
    if (!await confirm(t('groups.confirmTransfer') || 'CẢNH BÁO: Bạn sẽ mất quyền Chủ nhóm sau khi chuyển nhượng. Tiếp tục?', { isDanger: true })) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/owner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: userId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.transferFailed'));
      }
      addToast(t('groups.transferSuccess') || 'Đã chuyển nhượng nhóm thành công', 'info');
      onClose();
      await loadData();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Rời nhóm
  const handleLeaveGroup = async () => {
    if (!await confirm(t('groups.confirmLeave') || 'Bạn có chắc muốn rời khỏi nhóm này không?', { isDanger: true })) return;
    try {
      const myMemberRecord = members.find(m => m.userId === user?.sub);
      if (!myMemberRecord) return;
      const res = await fetch(`${api}/api/groups/${group.id}/members/${myMemberRecord.userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.leaveFailed'));
      }
      addToast(t('groups.leaveSuccess') || 'Rời nhóm thành công', 'info');
      onClose();
      window.location.href = '/cloud/dashboard';
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // 6. Giải tán nhóm (Owner chỉ định)
  const handleDisbandGroup = async () => {
    if (!await confirm(t('groups.confirmDisband') || 'HÀNH ĐỘNG NÀY KHÔNG THỂ PHỤC HỒI! Bạn có chắc chắn giải tán nhóm này?', { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.deleteFailed'));
      }
      addToast(t('groups.deleteSuccess') || 'Đã giải tán nhóm thành công', 'info');
      onClose();
      window.location.href = '/cloud/dashboard';
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>{group.name} - {t('groups.membersList') || 'Thành viên nhóm'}</h2>
          <button className="closeBtn" onClick={onClose}>✕</button>
        </div>

        {/* Form mời thành viên cho Owner và Admin */}
        {myRole !== 'member' && (
          <form onSubmit={handleInvite} className="inviteForm">
            {errorMsg && <div className="errorBanner">{errorMsg}</div>}
            <div className="inviteRow">
              <input
                type="email"
                placeholder={t('groups.inviteEmail') || 'Email người nhận...'}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={loading}
              />
              <CustomSelect
                value={inviteRole}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' }
                ]}
                onChange={(val) => setInviteRole(val as any)}
                disabled={myRole === 'admin' || loading}
                width="110px"
              />
              <button type="submit" disabled={!inviteEmail.trim() || loading} className="inviteBtn">
                {t('groups.inviteBtn') || 'Mời'}
              </button>
            </div>
          </form>
        )}

        {/* Danh sách thành viên */}
        <div className="membersContainer">
          {loading && members.length === 0 ? (
            <div className="loadingText">{t('sidebar.loading') || 'Đang tải...'}</div>
          ) : (
            <div className="membersList">
              {members.map((member) => {
                const isMe = member.userId === user?.sub;
                return (
                  <div key={member.userId} className="memberRow">
                    <div className="avatar">
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="meta">
                      <div className="name">
                        {member.name || member.email}
                        {isMe && <span className="meTag">(Tôi)</span>}
                      </div>
                      <div className="email">{member.email}</div>
                    </div>

                    <div className="roleActions">
                      <span className={`roleBadge ${member.role}`}>{member.role}</span>
                      
                      {!isMe && myRole !== 'member' && member.role !== 'owner' && actionLoadingId !== member.userId && (
                        <div className="actionButtons">
                          {myRole === 'owner' && (
                            <>
                              {member.role === 'admin' ? (
                                <button 
                                  onClick={() => handleUpdateRole(member.userId, 'member')}
                                  title={t('groups.demoteBtn') || 'Hạ xuống thành viên'}
                                  className="actionIconBtn"
                                >
                                  <Icons.ChevronDown size={14} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleUpdateRole(member.userId, 'admin')}
                                  title={t('groups.promoteBtn') || 'Thăng cấp Quản trị viên'}
                                  className="actionIconBtn"
                                >
                                  <Icons.ChevronUp size={14} />
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleTransferOwnership(member.userId)}
                                title={t('groups.transferBtn') || 'Nhượng chức Chủ nhóm'}
                                className="actionIconBtn ownershipBtn"
                              >
                                <Icons.Transfer size={14} />
                              </button>
                            </>
                          )}

                          {/* Owner có quyền kick bất kỳ ai, Admin có quyền kick member thường */}
                          {(myRole === 'owner' || (myRole === 'admin' && member.role === 'member')) && (
                            <button 
                              onClick={() => handleKick(member.userId)}
                              title={t('groups.kickBtn') || 'Trục xuất'}
                              className="actionIconBtn kickBtn"
                            >
                              <Icons.Close size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {actionLoadingId === member.userId && (
                        <span className="spinner">⌛</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nút thoát / giải tán ở footer */}
        <div className="modalFooter">
          {myRole === 'owner' ? (
            <button onClick={handleDisbandGroup} className="disbandBtn">
              {t('groups.disbandBtn') || 'Giải tán nhóm'}
            </button>
          ) : (
            <button onClick={handleLeaveGroup} className="leaveBtn">
              {t('groups.leaveBtn') || 'Rời khỏi nhóm'}
            </button>
          )}
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
          max-width: 480px;
          box-shadow: var(--modal-shadow);
          box-sizing: border-box;
          animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          max-height: 85vh;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .modalHeader h2 {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.4px;
          margin: 0;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 90%;
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
        .errorBanner {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.15);
          color: #fca5a5;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          margin-bottom: 12px;
        }
        
        .inviteForm {
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .inviteRow {
          display: flex;
          gap: 8px;
        }
        .inviteRow input[type="email"] {
          flex: 1;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-input);
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-size: 13.5px;
          outline: none;
          transition: all 0.2s ease;
        }
        .inviteRow input[type="email"]:focus {
          border-color: var(--border-input-focus);
          background: var(--bg-input-focus);
        }
        .inviteRow select {
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid var(--border-input);
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        .inviteBtn {
          background: var(--button-primary-bg);
          border: 1px solid var(--button-primary-bg);
          color: var(--button-primary-text);
          border-radius: 8px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .inviteBtn:hover {
          opacity: 0.95;
        }
        .inviteBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .membersContainer {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          max-height: 350px;
          padding: 4px;
        }
        .loadingText {
          text-align: center;
          padding: 30px;
          color: var(--text-muted);
          font-size: 13.5px;
        }
        .membersList {
          display: flex;
          flex-direction: column;
        }
        .memberRow {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s ease;
        }
        .memberRow:last-child {
          border-bottom: 0;
        }
        .memberRow:hover {
          background: var(--bg-item-hover);
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-item-active);
          border: 1px solid var(--border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .meTag {
          font-size: 10px;
          color: var(--text-accent);
          font-weight: 500;
        }
        .email {
          font-size: 11px;
          color: var(--text-muted);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        
        .roleActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .roleBadge {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 6px;
          letter-spacing: 0.3px;
        }
        .roleBadge.owner {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .roleBadge.admin {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .roleBadge.member {
          background: rgba(113, 113, 122, 0.15);
          color: #a1a1aa;
          border: 1px solid rgba(113, 113, 122, 0.2);
        }

        .actionButtons {
          display: flex;
          gap: 4px;
        }
        .actionIconBtn {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .actionIconBtn:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
          border-color: var(--border-color);
        }
        .ownershipBtn:hover {
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }
        .kickBtn:hover {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .modalFooter {
          display: flex;
          justify-content: flex-end;
          flex-shrink: 0;
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
        }
        .disbandBtn, .leaveBtn {
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .disbandBtn:hover, .leaveBtn:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
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
