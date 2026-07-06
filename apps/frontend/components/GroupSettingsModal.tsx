'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCloud } from '../context/CloudContext';
import { useConfirm } from '../context/ConfirmContext';
import * as Icons from './Icons';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';

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
  const { t, language } = useLanguage();
  const { api, user, addToast, loadData } = useCloud();
  const confirm = useConfirm();

  // Tab State: 'members' | 'pending' | 'invites'
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'invites'>('members');

  // Members States
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [kickedUserIds, setKickedUserIds] = useState<string[]>([]);

  // Group Invitation States
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // States cho Form tạo mã mời
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [expiresDate, setExpiresDate] = useState<string>('');
  const [isUnlimitedUses, setIsUnlimitedUses] = useState<boolean>(true);
  const [isNoExpiry, setIsNoExpiry] = useState<boolean>(true);
  const [expiryType, setExpiryType] = useState<'hours' | 'date'>('hours');

  const [createInviteMsg, setCreateInviteMsg] = useState<string>('');
  const [createInviteErr, setCreateInviteErr] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

  const fetchInvites = async () => {
    if (!group) return;
    setInvitesLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/invitations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invitations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    if (!group) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/pending-invites`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setPendingInvites(data.pending || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeInvite = async (notiId: string) => {
    const msg = language === 'vi'
      ? 'Bạn có chắc chắn muốn hủy lời mời này không?'
      : 'Are you sure you want to revoke this invitation?';
    if (!await confirm(msg, { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/pending-invites/${notiId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const successMsg = language === 'vi' ? 'Đã hủy lời mời thành công' : 'Invitation revoked successfully';
        addToast(successMsg, 'info');
        fetchPendingInvites();
      } else {
        if (data.code === 'INVITATION_ALREADY_RESOLVED') {
          throw new Error(t('groups.error.invitationAlreadyResolved') || 'Lời mời này đã được chấp nhận hoặc từ chối.');
        }
        throw new Error(data.message || 'Hủy thất bại');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => {
    if (isOpen && group) {
      setInviteEmail('');
      setInviteRole('member');
      setErrorMsg('');
      setActiveTab('members');
      fetchMembers();

      // Reset form invites
      setMaxUses(null);
      setExpiresInHours(null);
      setExpiresDate('');
      setIsUnlimitedUses(true);
      setIsNoExpiry(true);
      setExpiryType('hours');
      setCreateInviteMsg('');
      setCreateInviteErr('');
      setCopiedToken(null);
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (myRole === 'member' && activeTab === 'pending') {
      setActiveTab('members');
    }
  }, [myRole, activeTab]);

  useEffect(() => {
    if (isOpen && group && activeTab === 'invites') {
      fetchInvites();
      setCreateInviteMsg('');
      setCreateInviteErr('');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen || !group) return;

    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, metadata } = customEvent.detail || {};

      if (metadata && metadata.groupId === group.id) {
        fetchMembers();
        fetchPendingInvites();
        if (activeTab === 'invites' || type === 'group_join') {
          fetchInvites();
        }
      }
    };

    window.addEventListener('group-update', handleGroupUpdate);
    return () => {
      window.removeEventListener('group-update', handleGroupUpdate);
    };
  }, [isOpen, group, activeTab]);

  if (!isOpen || !group) return null;

  // 1. Mời thành viên trực tiếp qua Email dạng Notification
  const handleInviteEmailDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setErrorMsg('');
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/invite-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          throw new Error(t('groups.error.userNotFound') || 'Người dùng với email này không tồn tại.');
        }
        if (data.code === 'ALREADY_MEMBER') {
          throw new Error(t('groups.error.alreadyMember') || 'Người dùng này đã là thành viên của nhóm.');
        }
        if (data.code === 'PENDING_INVITE_EXISTS') {
          throw new Error(t('groups.error.pendingInviteExists') || 'Người dùng này đã có một lời mời đang chờ phản hồi.');
        }
        throw new Error(data.message || t('groups.inviteFailed') || 'Mời thành viên thất bại');
      }
      addToast(t('groups.inviteSuccess') || 'Gửi lời mời thành công!', 'info');
      setInviteEmail('');
      fetchMembers();
      fetchPendingInvites();
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

      // Kích hoạt animation biến mất
      setKickedUserIds((prev) => [...prev, userId]);

      // Chờ 400ms chạy xong animation rồi mới fetch lại từ server
      setTimeout(() => {
        fetchMembers();
        setKickedUserIds((prev) => prev.filter((id) => id !== userId));
      }, 400);

      addToast(t('groups.kickSuccess') || 'Đã trục xuất thành viên', 'info');
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
        body: JSON.stringify({ targetUserId: userId })
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
      const res = await fetch(`${api}/api/groups/${group.id}/leave`, {
        method: 'POST',
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

  // 7. Tạo mã mời nhóm mới
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateInviteMsg('');
    setCreateInviteErr('');
    try {
      const body = {
        maxUses: isUnlimitedUses ? null : maxUses,
        expiresInHours: isNoExpiry ? null : (expiryType === 'hours' ? expiresInHours : null),
        expiresDate: isNoExpiry ? null : (expiryType === 'date' ? expiresDate : null)
      };
      const res = await fetch(`${api}/api/groups/${group.id}/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('invite.createError') || 'Không tạo được mã mời');
      }
      setCreateInviteMsg(t('invite.createSuccess') || 'Tạo mã mời thành công!');
      fetchInvites();
    } catch (err: any) {
      setCreateInviteErr(err.message);
    }
  };

  // 8. Khóa thủ công mã mời nhóm
  const handleDeactivateInvite = async (inviteId: string) => {
    if (!await confirm(t('invite.confirmLock') || 'Bạn có chắc chắn muốn vô hiệu hóa mã mời này không?', { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/invitations/${inviteId}/deactivate`, {
        method: 'PUT',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Khóa mã mời thất bại');
      }
      addToast(t('invite.deactivateSuccess') || 'Đã khóa mã mời', 'info');
      fetchInvites();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // 9. Copy nhanh mã mời
  const copyToClipboard = (token: string, isActive: boolean) => {
    if (!isActive) {
      addToast(t('invite.copyLocked') || 'Mã đã khóa, không thể sử dụng!', 'error');
      return;
    }
    const inviteUrl = `${window.location.origin}/invite/group?code=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    addToast(t('invite.copySuccess', { token }) || `Đã sao chép liên kết vào clipboard!`, 'info');
    setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>

        {/* SIDEBAR DỌC BÊN TRÁI */}
        <div className="sidebarPanel">
          <div className="groupProfile">
            <div className="groupAvatar">
              <Icons.Group size={24} />
            </div>
            <div className="groupMeta">
              <span className="groupName" title={group.name}>{group.name}</span>
              <span className="groupRole">{myRole === 'owner' ? 'Chủ nhóm' : myRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}</span>
            </div>
          </div>

          <div className="verticalTabs">
            <button
              className={`verticalTabButton ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Icons.User size={16} />
              <span>{t('groups.membersTab') || 'Thành viên'}</span>
            </button>
            {myRole !== 'member' && (
              <button
                className={`verticalTabButton ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <Icons.Info size={16} />
                <span>{language === 'vi' ? 'Lời mời đang chờ' : 'Pending Invites'}</span>
              </button>
            )}
            <button
              className={`verticalTabButton ${activeTab === 'invites' ? 'active' : ''}`}
              onClick={() => setActiveTab('invites')}
            >
              <Icons.Documents size={16} />
              <span>{t('groups.invitesTab') || 'Mã mời nhóm'}</span>
            </button>
          </div>

          <div className="sidebarFooter">
            {myRole === 'owner' ? (
              <button onClick={handleDisbandGroup} className="sidebarActionBtn disband">
                <Icons.Trash size={13} />
                <span>{t('groups.disbandBtn') || 'Giải tán nhóm'}</span>
              </button>
            ) : (
              <button onClick={handleLeaveGroup} className="sidebarActionBtn leave">
                <Icons.LogOut size={13} />
                <span>{t('groups.leaveBtn') || 'Rời khỏi nhóm'}</span>
              </button>
            )}
          </div>
        </div>

        {/* NỘI DUNG PANEL CHÍNH BÊN PHẢI */}
        <div className="mainContentPanel">
          <div className="panelHeader">
            <h2>
              {activeTab === 'members'
                ? (t('groups.membersTab') || 'Thành viên nhóm')
                : activeTab === 'pending'
                  ? (language === 'vi' ? 'Lời mời đang chờ' : 'Pending Invites')
                  : (t('groups.invitesTab') || 'Quản lý mã mời')
              }
            </h2>
            <button className="closeBtn" onClick={onClose}>
              <Icons.Close size={16} />
            </button>
          </div>

          {/* TAB CONTENT: MEMBERS */}
          {activeTab === 'members' && (
            <div className="panelBody scrollable custom-scrollbar">
              {/* Form mời email */}
              {myRole !== 'member' && (
                <div className="inviteSection">
                  <h3 className="sectionSubtitle">{language === 'vi' ? 'Mời thành viên mới' : 'Invite new member'}</h3>
                  <form onSubmit={handleInviteEmailDirect} className="inviteForm">
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
                        <Icons.Plus size={14} style={{ marginRight: '4px' }} />
                        {t('groups.inviteBtn') || 'Mời'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Danh sách thành viên */}
              <div className="membersListContainer">
                <h3 className="sectionSubtitle">{language === 'vi' ? 'Danh sách thành viên' : 'Members List'}</h3>
                {loading && members.length === 0 ? (
                  <div className="loadingText">{t('sidebar.loading') || 'Đang tải...'}</div>
                ) : (
                  <div className="membersList">
                    {members.map((member) => {
                      const isLeaving = kickedUserIds.includes(member.user_id);
                      const isMe = member.user_id === user?.sub;
                      return (
                        <div key={member.user_id} className={`memberRow ${isLeaving ? 'leaving' : ''}`}>
                          <div className="avatar">
                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="meta">
                            <div className="name">
                              {member.name || member.email}
                              {isMe && <span className="meTag">{language === 'vi' ? '(Tôi)' : '(Me)'}</span>}
                            </div>
                            <div className="email">{member.email}</div>
                          </div>

                          <div className="roleActions">
                            <span className={`roleBadge ${member.role}`}>{member.role}</span>

                            {!isMe && myRole !== 'member' && member.role !== 'owner' && actionLoadingId !== member.user_id && (
                              <div className="actionButtons">
                                {myRole === 'owner' && (
                                  <>
                                    {member.role === 'admin' ? (
                                      <button
                                        onClick={() => handleUpdateRole(member.user_id, 'member')}
                                        title={t('groups.demoteBtn') || 'Hạ xuống thành viên'}
                                        className="actionIconBtn"
                                      >
                                        <Icons.ChevronDown size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateRole(member.user_id, 'admin')}
                                        title={t('groups.promoteBtn') || 'Thăng cấp Quản trị viên'}
                                        className="actionIconBtn"
                                      >
                                        <Icons.ChevronUp size={14} />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleTransferOwnership(member.user_id)}
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
                                    onClick={() => handleKick(member.user_id)}
                                    title={t('groups.kickBtn') || 'Trục xuất'}
                                    className="actionIconBtn kickBtn"
                                  >
                                    <Icons.Close size={12} />
                                  </button>
                                )}
                              </div>
                            )}

                            {actionLoadingId === member.user_id && (
                              <span className="spinner">⌛</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: PENDING INVITES */}
          {activeTab === 'pending' && myRole !== 'member' && (
            <div className="panelBody scrollable custom-scrollbar">
              <div className="pendingInvitesContainer">
                {pendingInvites.length === 0 ? (
                  <div className="emptyPendingText" style={{
                    fontSize: '13.5px',
                    color: 'var(--text-muted, #71717a)',
                    fontStyle: 'italic',
                    padding: '30px 20px',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    marginTop: '8px'
                  }}>
                    {language === 'vi' ? 'Không có lời mời nào đang chờ phản hồi' : 'No pending invitations'}
                  </div>
                ) : (
                  <div className="membersList" style={{ marginTop: '8px' }}>
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="memberRow">
                        <div className="avatar pending-avatar" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icons.User size={14} />
                        </div>
                        <div className="meta">
                          <div className="name">
                            {invite.name || invite.email}
                            <span className="pendingTag" style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted, #71717a)', fontStyle: 'italic' }}>
                              {language === 'vi' ? '(Đang chờ)' : '(Pending)'}
                            </span>
                          </div>
                          <div className="email">{invite.email}</div>
                        </div>
                        <div className="roleActions">
                          <span className={`roleBadge ${invite.role}`}>{invite.role}</span>
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            title={language === 'vi' ? 'Hủy lời mời' : 'Revoke invitation'}
                            className="actionIconBtn kickBtn"
                          >
                            <Icons.Close size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: INVITES */}
          {activeTab === 'invites' && (
            <div className="panelBody no-scroll">
              <div className="invitesTwoColumnLayout">

                {/* CỘT TRÁI: TẠO MÃ MỚI */}
                <div className="invitesFormColumn">
                  <h3 className="sectionSubtitle">{language === 'vi' ? 'Tạo mã mời mới' : 'Create Invite Code'}</h3>

                  {myRole !== 'member' ? (
                    <form onSubmit={handleCreateInvite} className="createInviteForm">
                      <div className="alertContainer">
                        {createInviteMsg && <div className="alertMsg successMsg">{createInviteMsg}</div>}
                        {createInviteErr && <div className="alertMsg errorMsg">{createInviteErr}</div>}
                      </div>

                      {/* Lượt dùng */}
                      <div className="formField">
                        <div className="formFieldHeader">
                          <label>{t('invite.maxUsesLabel') || 'Số lượt sử dụng tối đa'}</label>
                          <div className="toggleWrapper">
                            <span className="toggleLabel">{t('invite.unlimited') || 'Không giới hạn'}</span>
                            <button
                              type="button"
                              className={`premiumSwitch ${isUnlimitedUses ? 'active' : ''}`}
                              onClick={() => {
                                setIsUnlimitedUses(!isUnlimitedUses);
                                if (isUnlimitedUses) setMaxUses(1);
                              }}
                            >
                              <span className="premiumSwitchHandle" />
                            </button>
                          </div>
                        </div>
                        <div className={`inputHeightWrapper ${!isUnlimitedUses ? 'open' : ''}`}>
                          <input
                            type="number"
                            min="1"
                            placeholder="Ví dụ: 10"
                            value={maxUses || ''}
                            onChange={(e) => setMaxUses(parseInt(e.target.value) || null)}
                            disabled={isUnlimitedUses}
                            className="no-spinner textInput"
                          />
                        </div>
                      </div>

                      {/* Hạn dùng */}
                      <div className="formField">
                        <div className="formFieldHeader">
                          <label>{t('invite.expiresLabel') || 'Thời hạn hết hạn'}</label>
                          <div className="toggleWrapper">
                            <span className="toggleLabel">{t('invite.noExpiry') || 'Không hết hạn'}</span>
                            <button
                              type="button"
                              className={`premiumSwitch ${isNoExpiry ? 'active' : ''}`}
                              onClick={() => setIsNoExpiry(!isNoExpiry)}
                            >
                              <span className="premiumSwitchHandle" />
                            </button>
                          </div>
                        </div>

                        <div className={`inputHeightWrapper ${!isNoExpiry ? 'open' : ''}`}>
                          <div className="expiryTypeTabs">
                            <button
                              type="button"
                              className={`expiryTypeTab ${expiryType === 'hours' ? 'active' : ''}`}
                              onClick={() => {
                                setExpiryType('hours');
                                setExpiresDate('');
                              }}
                            >
                              {language === 'vi' ? 'Theo giờ' : 'By hours'}
                            </button>
                            <button
                              type="button"
                              className={`expiryTypeTab ${expiryType === 'date' ? 'active' : ''}`}
                              onClick={() => {
                                setExpiryType('date');
                                setExpiresInHours(null);
                              }}
                            >
                              {language === 'vi' ? 'Theo ngày' : 'By date'}
                            </button>
                          </div>

                          <div className="expiryValueInputContainer">
                            {expiryType === 'hours' ? (
                              <input
                                type="number"
                                min="1"
                                placeholder={t('invite.hoursPlaceholder') || 'Số giờ (ví dụ: 24)'}
                                value={expiresInHours || ''}
                                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || null)}
                                className="no-spinner textInput"
                              />
                            ) : (
                              <CustomDatePicker
                                value={expiresDate}
                                onChange={(val) => setExpiresDate(val)}
                                placeholder={t('invite.datePlaceholder') || 'Chọn ngày...'}
                              />
                            )}
                          </div>
                          {expiryType === 'date' && (
                            <span className="fieldHint">{t('invite.expiryDateHint') || '* Hết hạn vào lúc 23:59:59 của ngày được chọn.'}</span>
                          )}
                        </div>
                      </div>

                      <button type="submit" className="createBtn">
                        {t('invite.createBtn') || 'Tạo mã mời'}
                      </button>
                    </form>
                  ) : (
                    <div className="memberInviteInfo">
                      {t('invite.membersOnlyView') || 'Chỉ Quản trị viên mới được phép tạo mã mời.'}
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: BẢNG DANH SÁCH MÃ MỜI */}
                <div className="invitesListColumn">
                  <div className="listHeader">
                    <h3 className="sectionSubtitle">{t('invite.listTitle') || 'Danh sách mã mời đã tạo'}</h3>
                    <p className="copyHint">{t('invite.clickToCopyHint') || '* Nhấp vào mã mời để sao chép nhanh.'}</p>
                  </div>

                  <div className="invitesTableContainer custom-scrollbar">
                    {invitesLoading && invites.length === 0 ? (
                      <div className="loadingText">{t('sidebar.loading') || 'Đang tải...'}</div>
                    ) : invites.length === 0 ? (
                      <div className="emptyInvitesText">{t('invite.emptyList') || 'Chưa có mã mời nào được tạo.'}</div>
                    ) : (
                      <table className="invitesTable">
                        <thead>
                          <tr>
                            <th>{language === 'vi' ? 'Mã' : 'Code'}</th>
                            <th>{language === 'vi' ? 'Dùng' : 'Uses'}</th>
                            <th>{language === 'vi' ? 'Hạn dùng' : 'Expires'}</th>
                            <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                            <th style={{ textAlign: 'center' }}>{language === 'vi' ? 'Hành động' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invites.map((inviteItem) => {
                            const isItemExpired = inviteItem.expires_at ? new Date(inviteItem.expires_at) < new Date() : false;
                            const isLimitReached = inviteItem.max_uses ? inviteItem.uses_count >= inviteItem.max_uses : false;
                            const isCurrentlyActive = inviteItem.is_active && !isItemExpired && !isLimitReached;

                            return (
                              <tr key={inviteItem.id} className={isCurrentlyActive ? 'row-active' : 'row-locked'}>
                                <td>
                                  <div
                                    className="tokenCell"
                                    onClick={() => copyToClipboard(inviteItem.token, isCurrentlyActive)}
                                    title={isCurrentlyActive ? t('invite.titleCopyActive') : t('invite.titleCopyLocked')}
                                  >
                                    <span className="tokenText">{inviteItem.token}</span>
                                    {isCurrentlyActive && <span className="copyBtnIcon">📋</span>}
                                  </div>
                                </td>
                                <td>
                                  {inviteItem.uses_count}/{inviteItem.max_uses !== null ? inviteItem.max_uses : '∞'}
                                </td>
                                <td className="expiresCell" title={inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleString() : ''}>
                                  {inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleDateString() : '∞'}
                                </td>
                                <td>
                                  <span className={`statusBadge ${isCurrentlyActive ? 'active' : 'locked'}`}>
                                    {isCurrentlyActive ? (language === 'vi' ? 'Chạy' : 'Active') : (language === 'vi' ? 'Khóa' : 'Locked')}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {isCurrentlyActive && myRole !== 'member' ? (
                                    <button
                                      className="tableLockBtn"
                                      onClick={() => handleDeactivateInvite(inviteItem.id)}
                                      title={t('actions.lock') || 'Khóa mã'}
                                    >
                                      {language === 'vi' ? 'Khóa' : 'Lock'}
                                    </button>
                                  ) : (
                                    <span className="lockedPlaceholder">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        /* Kích thước popup cố định, phẳng giống System Admin Settings */
        .modalBackdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-backdrop, rgba(0, 0, 0, 0.4));
          backdrop-filter: blur(16px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: backdropFadeIn 0.2s ease-out;
        }
        .modalContent {
          background: var(--bg-modal-wrapper, rgba(23, 23, 27, 0.85));
          backdrop-filter: blur(25px);
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.08));
          border-radius: 20px;
          width: 1160px;
          height: 580px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
          animation: modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--text-primary);
          display: flex;
          overflow: hidden;
        }

        /* PANEL SIDEBAR DỌC BÊN TRÁI */
        .sidebarPanel {
          width: 220px;
          background: rgba(0, 0, 0, 0.15);
          border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          display: flex;
          flex-direction: column;
          padding: 20px;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .groupProfile {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .groupAvatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.15);
          color: var(--accent-color, #3b82f6);
          border: 1px solid rgba(59, 130, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .groupMeta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .groupName {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .groupRole {
          font-size: 11px;
          color: var(--text-muted, #71717a);
          margin-top: 2px;
        }
        .verticalTabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .verticalTabButton {
          background: transparent;
          border: 0;
          outline: none;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          color: var(--text-secondary, #a1a1aa);
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          font-family: inherit;
        }
        .verticalTabButton:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }
        .verticalTabButton.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-color, #3b82f6);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        .sidebarFooter {
          margin-top: auto;
        }
        .sidebarActionBtn {
          width: 100%;
          border: 1px solid rgba(239, 68, 68, 0.15);
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .sidebarActionBtn:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        /* NỘI DUNG PANEL CHÍNH BÊN PHẢI */
        .mainContentPanel {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
          min-width: 0;
          overflow: visible; /* Cho phép datepicker nổi lên trên */
        }
        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-shrink: 0;
        }
        .panelHeader h2 {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.4px;
          margin: 0;
        }
        .closeBtn {
          background: transparent;
          border: 0;
          color: var(--text-muted, #71717a);
          cursor: pointer;
          transition: color 0.15s;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .closeBtn:hover {
          color: var(--text-primary);
        }

        /* TAB BODY PANEL CONTAINER */
        .panelBody {
          flex: 1;
          min-height: 0;
        }
        .panelBody.scrollable {
          overflow-y: auto;
          padding-right: 4px;
        }
        .panelBody.no-scroll {
          overflow: visible; /* Cần thiết để CustomDatePicker không bị cắt */
        }

        /* COMMON SECTION STYLES */
        .sectionSubtitle {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }

        /* MEMBERS TAB LOGIC & FORM */
        .inviteSection {
          margin-bottom: 24px;
        }
        .inviteForm {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          border-radius: 12px;
          padding: 14px;
        }
        .inviteRow {
          display: flex;
          gap: 10px;
        }
        .inviteRow input[type="email"] {
          flex: 1;
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-input, rgba(255, 255, 255, 0.1));
          background-color: var(--bg-input, rgba(0, 0, 0, 0.2));
          color: var(--text-primary);
          font-size: 13.5px;
          outline: none;
          transition: all 0.2s ease;
        }
        .inviteRow input[type="email"]:focus {
          border-color: var(--border-input-focus, #3b82f6);
          background: var(--bg-input-focus, rgba(0, 0, 0, 0.3));
        }
        .inviteBtn {
          background: var(--button-primary-bg, #ffffff);
          border: none;
          color: var(--button-primary-text, #000000);
          border-radius: 8px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          font-family: inherit;
        }
        .inviteBtn:hover {
          opacity: 0.92;
        }
        .inviteBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* MEMBERS LIST */
        .membersListContainer {
          display: flex;
          flex-direction: column;
        }
        .membersList {
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          border-radius: 12px;
          overflow: hidden;
        }
        .memberRow {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          transition: background 0.15s ease;
          animation: memberRowFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .memberRow:last-child {
          border-bottom: 0;
        }
        .memberRow:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .memberRow.leaving {
          animation: memberRowFadeOut 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
          border-bottom: 0;
          pointer-events: none;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
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
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meTag {
          font-size: 10px;
          color: var(--accent-color, #3b82f6);
          font-weight: 600;
          background: rgba(59, 130, 246, 0.15);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .email {
          font-size: 11.5px;
          color: var(--text-muted, #71717a);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .roleActions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .roleBadge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2.5px 7px;
          border-radius: 6px;
          letter-spacing: 0.3px;
        }
        .roleBadge.owner {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .roleBadge.admin {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }
        .roleBadge.member {
          background: rgba(161, 161, 170, 0.1);
          color: #d4d4d8;
          border: 1px solid rgba(161, 161, 170, 0.15);
        }

        .actionButtons {
          display: flex;
          gap: 4px;
        }
        .actionIconBtn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .actionIconBtn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .ownershipBtn:hover {
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.3);
        }
        .kickBtn:hover {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
        }
        
        /* TWO COLUMN INVITES TAB LAYOUT */
        .invitesTwoColumnLayout {
          display: flex;
          gap: 24px;
          height: 100%;
          overflow: visible; /* Rất quan trọng để hiển thị datepicker */
        }
        .invitesFormColumn {
          width: 290px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          overflow: visible;
        }
        .invitesListColumn {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        
        .createInviteForm {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow: visible; /* Cực kỳ quan trọng */
        }
        .alertMsg {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 8px;
          animation: slideDownIn 0.2s ease-out forwards;
        }
        .successMsg {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
        }
        .errorMsg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        .formField {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: visible; /* Đảm bảo CustomDatePicker có thể tràn ra ngoài formField */
        }
        .formFieldHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .formField label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .toggleWrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toggleLabel {
          font-size: 11px;
          color: var(--text-muted, #71717a);
        }
        .premiumSwitch {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 34px;
          height: 18px;
          border-radius: 99px;
          position: relative;
          cursor: pointer;
          transition: all 0.25s ease;
          padding: 0;
        }
        .premiumSwitch.active {
          background: var(--accent-color, #3b82f6);
          border-color: var(--accent-color);
        }
        .premiumSwitchHandle {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 50%;
          left: 3px;
          transform: translateY(-50%);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premiumSwitch.active .premiumSwitchHandle {
          left: calc(100% - 15px);
        }
        
        .inputHeightWrapper {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          visibility: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        /* Mấu chốt gỡ lỗi DatePicker: khi wrapper mở ra, ta phải cho overflow: visible */
        .inputHeightWrapper.open {
          max-height: 95px;
          opacity: 1;
          visibility: visible;
          padding-top: 4px;
          overflow: visible; 
        }

        .expiryTypeTabs {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 2px;
          gap: 2px;
        }
        .expiryTypeTab {
          flex: 1;
          background: transparent;
          border: 0;
          color: var(--text-muted, #71717a);
          font-size: 11px;
          font-weight: 600;
          padding: 5px 0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .expiryTypeTab:hover {
          color: var(--text-primary);
        }
        .expiryTypeTab.active {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .expiryValueInputContainer {
          position: relative;
          overflow: visible; /* Cực kỳ quan trọng để CustomDatePicker hiển thị popup */
        }

        .textInput {
          background: var(--bg-input, rgba(0, 0, 0, 0.2));
          border: 1px solid var(--border-input, rgba(255, 255, 255, 0.1));
          color: var(--text-primary);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .textInput:focus {
          border-color: var(--border-input-focus, #3b82f6);
          background: var(--bg-input-focus, rgba(0, 0, 0, 0.3));
        }
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .fieldHint {
          font-size: 10.5px;
          color: var(--text-muted, #71717a);
          font-style: italic;
        }
        .createBtn {
          background: var(--button-primary-bg, #ffffff);
          border: none;
          color: var(--button-primary-text, #000000);
          border-radius: 8px;
          padding: 10px 0;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s ease;
          text-align: center;
          margin-top: 4px;
        }
        .createBtn:hover {
          opacity: 0.92;
        }
        .memberInviteInfo {
          text-align: center;
          padding: 24px 16px;
          font-size: 12.5px;
          color: var(--text-muted);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
        }

        /* TABLE VIEW DANH SÁCH MÃ MỜI ĐÃ TẠO */
        .listHeader {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .copyHint {
          margin: 0;
          font-size: 11px;
          color: var(--text-muted, #71717a);
        }
        .invitesTableContainer {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.1);
          max-height: 380px;
        }
        .emptyInvitesText {
          text-align: center;
          padding: 40px 20px;
          font-size: 13px;
          color: var(--text-muted);
        }
        
        /* TABLE STYLING */
        .invitesTable {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12.5px;
        }
        .invitesTable th {
          background: rgba(0, 0, 0, 0.2);
          padding: 10px 12px;
          font-weight: 700;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .invitesTable td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
          vertical-align: middle;
        }
        .invitesTable tr:last-child td {
          border-bottom: none;
        }
        .invitesTable tr:hover td {
          background: rgba(255, 255, 255, 0.015);
        }
        .invitesTable tr.row-locked {
          opacity: 0.55;
        }
        
        .tokenCell {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 4px 8px;
          font-family: monospace;
          font-weight: 700;
          color: var(--accent-color, #3b82f6);
          transition: all 0.15s ease;
        }
        .row-active .tokenCell:hover {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
        }
        .tokenText {
          font-size: 11.5px;
        }
        .copyBtnIcon {
          font-size: 10px;
          opacity: 0.8;
        }
        .expiresCell {
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .statusBadge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .statusBadge.active {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .statusBadge.locked {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        
        .tableLockBtn {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .tableLockBtn:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .lockedPlaceholder {
          color: var(--text-muted, #71717a);
          font-size: 12px;
        }

        /* ANIMATIONS & RESPONSIVE */
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes memberRowFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes memberRowFadeOut {
          from { opacity: 1; transform: translateY(0); max-height: 80px; padding-top: 12px; padding-bottom: 12px; }
          to { opacity: 0; transform: translateY(-8px); max-height: 0; padding-top: 0; padding-bottom: 0; }
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
