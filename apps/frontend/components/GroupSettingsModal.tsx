'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { t, language } = useLanguage();
  const { api, user, addToast, loadData } = useCloud();
  const confirm = useConfirm();

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return t('groups.roleOwner') || 'Owner';
    if (role === 'admin') return t('groups.roleAdmin') || 'Admin';
    return t('groups.roleMember') || 'Member';
  };

  const getTabTitle = () => {
    if (activeTab === 'members') return t('groups.membersListTitle') || 'Members List';
    if (activeTab === 'pending') return t('groups.pendingTab') || 'Pending Invites';
    return t('groups.invitesTab') || 'Group Invites';
  };

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
  const [isSubmittingInvite, setIsSubmittingInvite] = useState<boolean>(false);

  // Lấy vai trò của người dùng hiện tại trong nhóm này (realtime dynamic state)
  const [localRole, setLocalRole] = useState<'owner' | 'admin' | 'member'>((group?.role as any) || 'member');

  useEffect(() => {
    if (group?.role) {
      setLocalRole(group.role);
    }
  }, [group?.role]);

  const fetchMembers = async () => {
    if (!group) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/members`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || (language === 'en' ? 'You no longer have permission to access this group.' : 'Bạn không còn quyền truy cập nhóm này.'), 'error');
          onClose();
          await loadData();
          return;
        }
        throw new Error('Failed to fetch members');
      }
      const data = await res.json();
      // Sắp xếp thứ tự: Owner -> Admin -> Member
      const sorted = (data.members || []).sort((a: any, b: any) => {
        const roleWeights = { owner: 3, admin: 2, member: 1 };
        const wA = roleWeights[a.role as keyof typeof roleWeights] || 0;
        const wB = roleWeights[b.role as keyof typeof roleWeights] || 0;
        return wB - wA;
      });
      setMembers(sorted);

      // Cập nhật vai trò cục bộ realtime của chính mình
      const me = sorted.find((m: any) => m.user_id === user?.sub);
      if (me) {
        setLocalRole(me.role);
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
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || (language === 'en' ? 'You no longer have permission to access this group.' : 'Bạn không còn quyền truy cập nhóm này.'), 'error');
          onClose();
          await loadData();
          return;
        }
        throw new Error('Failed to fetch invites');
      }
      const data = await res.json();
      setInvites(data.invitations || []);
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
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || (language === 'en' ? 'You no longer have permission to access this group.' : 'Bạn không còn quyền truy cập nhóm này.'), 'error');
          onClose();
          await loadData();
          return;
        }
        throw new Error('Failed to fetch pending invites');
      }
      const data = await res.json();
      if (data.ok) {
        setPendingInvites(data.pending || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeInvite = async (notiId: string) => {
    const msg = t('groups.confirmRevoke') || (language === 'en' ? 'Are you sure you want to revoke this invitation?' : 'Bạn có chắc chắn muốn hủy lời mời này không?');
    if (!await confirm(msg, { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/pending-invites/${notiId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const successMsg = t('groups.inviteRevokedSuccess') || (language === 'en' ? 'Invitation revoked successfully' : 'Đã hủy lời mời thành công');
        addToast(successMsg, 'info');
        fetchPendingInvites();
      } else {
        if (data.code === 'INVITATION_ALREADY_RESOLVED') {
          throw new Error(t('groups.error.invitationAlreadyResolved') || (language === 'en' ? 'This invitation has already been accepted or declined.' : 'Lời mời này đã được chấp nhận hoặc từ chối.'));
        }
        throw new Error(data.message || (language === 'en' ? 'Revocation failed' : 'Hủy thất bại'));
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
      setKickedUserIds([]);
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
    if (localRole === 'member' && activeTab === 'pending') {
      setActiveTab('members');
    }
  }, [localRole, activeTab]);

  useEffect(() => {
    if (isOpen && group) {
      if (activeTab === 'invites') {
        fetchInvites();
        setCreateInviteMsg('');
        setCreateInviteErr('');
      } else if (activeTab === 'pending') {
        fetchPendingInvites();
      }
    }
  }, [activeTab, isOpen, group]);

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
          throw new Error(t('groups.error.userNotFound') || (language === 'en' ? 'User with this email does not exist.' : 'Người dùng với email này không tồn tại.'));
        }
        if (data.code === 'ALREADY_MEMBER') {
          throw new Error(t('groups.error.alreadyMember') || (language === 'en' ? 'This user is already a member of the group.' : 'Người dùng này đã là thành viên của nhóm.'));
        }
        if (data.code === 'PENDING_INVITE_EXISTS') {
          throw new Error(t('groups.error.pendingInviteExists') || (language === 'en' ? 'This user already has a pending invitation.' : 'Người dùng này đã có một lời mời đang chờ phản hồi.'));
        }
        throw new Error(data.message || t('groups.inviteFailed') || (language === 'en' ? 'Failed to invite member' : 'Mời thành viên thất bại'));
      }
      addToast(t('groups.inviteSuccess') || (language === 'en' ? 'Invitation sent successfully!' : 'Gửi lời mời thành công!'), 'info');
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
      addToast(t(msgKey) || (language === 'en' ? 'Role updated successfully' : 'Cập nhật chức vụ thành công'), 'info');
      fetchMembers();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Trục xuất thành viên
  const handleKick = async (userId: string) => {
    if (!await confirm(t('groups.confirmKick') || (language === 'en' ? 'Are you sure you want to expel this member?' : 'Bạn có chắc chắn muốn trục xuất thành viên này?'), { isDanger: true })) return;
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

      addToast(t('groups.kickSuccess') || (language === 'en' ? 'Member expelled successfully' : 'Đã trục xuất thành viên'), 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Nhượng quyền Owner
  const handleTransferOwnership = async (userId: string) => {
    if (!await confirm(t('groups.confirmTransfer') || (language === 'en' ? 'WARNING: You will lose Group Owner privileges after transferring. Do you want to proceed?' : 'CẢNH BÁO: Bạn sẽ mất quyền Chủ nhóm sau khi chuyển nhượng. Tiếp tục?'), { isDanger: true })) return;
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
      addToast(t('groups.transferSuccess') || (language === 'en' ? 'Group ownership transferred successfully' : 'Đã chuyển nhượng nhóm thành công'), 'info');
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
    if (!await confirm(t('groups.confirmLeave') || (language === 'en' ? 'Are you sure you want to leave this group?' : 'Bạn có chắc muốn rời khỏi nhóm này không?'), { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}/leave`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.leaveFailed'));
      }
      addToast(t('groups.leaveSuccess') || (language === 'en' ? 'Left group successfully' : 'Rời nhóm thành công'), 'info');
      onClose();
      router.push('/cloud/dashboard');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // 6. Giải tán nhóm (Owner chỉ định)
  const handleDisbandGroup = async () => {
    if (!await confirm(t('groups.confirmDisband') || (language === 'en' ? 'THIS ACTION CANNOT BE UNDONE! Are you sure you want to disband this group?' : 'HÀNH ĐỘNG NÀY KHÔNG THỂ PHỤC HỒI! Bạn có chắc chắn giải tán nhóm này?'), { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t('groups.deleteFailed'));
      }
      addToast(t('groups.deleteSuccess') || (language === 'en' ? 'Disbanded group successfully' : 'Đã giải tán nhóm thành công'), 'info');
      onClose();
      router.push('/cloud/dashboard');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // 7. Tạo mã mời nhóm mới
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInvite) return;
    setCreateInviteMsg('');
    setCreateInviteErr('');

    // Frontend validation
    if (!isUnlimitedUses && (maxUses === null || maxUses <= 0)) {
      setCreateInviteErr(t('invite.validation.maxUsesRequired') || (language === 'en' ? 'Please enter a maximum number of uses.' : 'Vui lòng nhập số lượt sử dụng tối đa.'));
      return;
    }
    if (!isNoExpiry) {
      if (expiryType === 'hours' && (expiresInHours === null || expiresInHours <= 0)) {
        setCreateInviteErr(t('invite.validation.hoursRequired') || (language === 'en' ? 'Please enter the number of expiration hours.' : 'Vui lòng nhập số giờ hết hạn.'));
        return;
      }
      if (expiryType === 'date' && !expiresDate) {
        setCreateInviteErr(t('invite.validation.dateRequired') || (language === 'en' ? 'Please select an expiration date.' : 'Vui lòng chọn ngày hết hạn.'));
        return;
      }
    }

    setIsSubmittingInvite(true);
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
        throw new Error(data.message || t('invite.createError') || (language === 'en' ? 'Failed to create invite code' : 'Không tạo được mã mời'));
      }
      setCreateInviteMsg(t('invite.createSuccess') || (language === 'en' ? 'Invite code created successfully!' : 'Tạo mã mời thành công!'));
      fetchInvites();
    } catch (err: any) {
      setCreateInviteErr(err.message);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // 8. Khóa thủ công mã mời nhóm
  const handleDeactivateInvite = async (inviteId: string) => {
    if (!await confirm(t('invite.confirmLock') || (language === 'en' ? 'Are you sure you want to deactivate this invite code?' : 'Bạn có chắc chắn muốn vô hiệu hóa mã mời này không?'), { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/groups/invitations/${inviteId}/deactivate`, {
        method: 'PUT',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (language === 'en' ? 'Deactivation failed' : 'Khóa mã mời thất bại'));
      }
      addToast(t('invite.deactivateSuccess') || (language === 'en' ? 'Invite code deactivated successfully' : 'Đã khóa mã mời'), 'info');
      fetchInvites();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // 9. Copy nhanh mã mời
  const copyToClipboard = (token: string, isActive: boolean) => {
    if (!isActive) {
      addToast(t('invite.copyLocked') || (language === 'en' ? 'Invite code is locked and cannot be used!' : 'Mã đã khóa, không thể sử dụng!'), 'error');
      return;
    }
    const inviteUrl = `${window.location.origin}/invite/group?code=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    addToast(t('invite.copySuccess', { token }) || (language === 'en' ? 'Copied link to clipboard!' : 'Đã sao chép liên kết vào clipboard!'), 'info');
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
              <span className="groupRole">{getRoleLabel(localRole)}</span>
            </div>
          </div>

          <div className="verticalTabs">
            <button
              className={`verticalTabButton ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Icons.User size={16} />
              <span>{t('groups.membersTab') || (language === 'en' ? 'Members' : 'Thành viên')}</span>
            </button>
            {localRole !== 'member' && (
              <button
                className={`verticalTabButton ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <Icons.Info size={16} />
                <span>{t('groups.pendingTab') || (language === 'en' ? 'Pending Invites' : 'Lời mời đang chờ')}</span>
              </button>
            )}
            <button
              className={`verticalTabButton ${activeTab === 'invites' ? 'active' : ''}`}
              onClick={() => setActiveTab('invites')}
            >
              <Icons.Documents size={16} />
              <span>{t('groups.invitesTab') || (language === 'en' ? 'Group Invites' : 'Mã mời nhóm')}</span>
            </button>
          </div>

          <div className="sidebarFooter">
            {localRole === 'owner' ? (
              <button onClick={handleDisbandGroup} className="sidebarActionBtn disband">
                <Icons.Trash size={13} />
                <span>{t('groups.disbandBtn') || (language === 'en' ? 'Disband Group' : 'Giải tán nhóm')}</span>
              </button>
            ) : (
              <button onClick={handleLeaveGroup} className="sidebarActionBtn leave">
                <Icons.LogOut size={13} />
                <span>{t('groups.leaveBtn') || (language === 'en' ? 'Leave Group' : 'Rời khỏi nhóm')}</span>
              </button>
            )}
          </div>
        </div>

        {/* NỘI DUNG PANEL CHÍNH BÊN PHẢI */}
        <div className="mainContentPanel">
          <div className="panelHeader">
            <h2>{getTabTitle()}</h2>
            <button className="closeBtn" onClick={onClose}>
              <Icons.Close size={16} />
            </button>
          </div>

          {/* TAB CONTENT: MEMBERS */}
          {activeTab === 'members' && (
            <div className="panelBody scrollable custom-scrollbar">
              {/* Form mời email */}
              {localRole !== 'member' && (
                <div className="inviteSection">
                  <h3 className="sectionSubtitle">{t('groups.inviteSectionTitle') || (language === 'en' ? 'Invite new member' : 'Mời thành viên mới')}</h3>
                  <form onSubmit={handleInviteEmailDirect} className="inviteForm">
                    {errorMsg && <div className="errorBanner">{errorMsg}</div>}
                    <div className="inviteRow">
                      <input
                        type="email"
                        placeholder={t('groups.inviteEmail') || (language === 'en' ? "Recipient's email..." : 'Email người nhận...')}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <CustomSelect
                        value={inviteRole}
                        options={[
                          { value: 'member', label: t('groups.roleMember') || (language === 'en' ? 'Member' : 'Thành viên') },
                          { value: 'admin', label: t('groups.roleAdmin') || (language === 'en' ? 'Admin' : 'Quản trị viên') }
                        ]}
                        onChange={(val) => setInviteRole(val as any)}
                        disabled={localRole === 'admin' || loading}
                        width="135px"
                      />
                      <button type="submit" disabled={!inviteEmail.trim() || loading} className="inviteBtn">
                        <Icons.Plus size={14} style={{ marginRight: '4px' }} />
                        {t('groups.inviteBtn') || (language === 'en' ? 'Invite' : 'Mời')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Danh sách thành viên */}
              <div className="membersListContainer">
                <h3 className="sectionSubtitle">{t('groups.membersListTitle') || (language === 'en' ? 'Members list' : 'Danh sách thành viên')}</h3>
                {loading && members.length === 0 ? (
                  <div className="loadingText">{t('sidebar.loading') || (language === 'en' ? 'Loading...' : 'Đang tải...')}</div>
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
                              {isMe && <span className="meTag">{t('groups.meTag') || '(Tôi)'}</span>}
                            </div>
                            <div className="email">{member.email}</div>
                          </div>

                          <div className="roleActions">
                            <span className={`roleBadge ${member.role}`}>{getRoleLabel(member.role).toUpperCase()}</span>

                            {!isMe && localRole !== 'member' && member.role !== 'owner' && actionLoadingId !== member.user_id && !isLeaving && (
                              <div className="actionButtons">
                                {localRole === 'owner' && (
                                  <>
                                    {member.role === 'admin' ? (
                                      <button
                                        onClick={() => handleUpdateRole(member.user_id, 'member')}
                                        title={t('groups.demoteBtn') || (language === 'en' ? 'Demote to Member' : 'Hạ xuống thành viên')}
                                        className="actionIconBtn"
                                      >
                                        <Icons.ChevronDown size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateRole(member.user_id, 'admin')}
                                        title={t('groups.promoteBtn') || (language === 'en' ? 'Promote to Admin' : 'Thăng cấp Quản trị viên')}
                                        className="actionIconBtn"
                                      >
                                        <Icons.ChevronUp size={14} />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleTransferOwnership(member.user_id)}
                                       title={t('groups.transferBtn') || (language === 'en' ? 'Transfer Ownership' : 'Nhượng chức Chủ nhóm')}
                                      className="actionIconBtn ownershipBtn"
                                    >
                                      <Icons.Transfer size={14} />
                                    </button>
                                  </>
                                )}

                                {/* Owner có quyền kick bất kỳ ai, Admin có quyền kick member thường */}
                                {(localRole === 'owner' || (localRole === 'admin' && member.role === 'member')) && (
                                  <button
                                    onClick={() => handleKick(member.user_id)}
                                    title={t('groups.kickBtn') || (language === 'en' ? 'Kick' : 'Trục xuất')}
                                    className="actionIconBtn kickBtn"
                                  >
                                    <Icons.Close size={12} />
                                  </button>
                                )}
                              </div>
                            )}

                            {actionLoadingId === member.user_id && (
                              <Icons.Refresh size={14} className="spinner" style={{ color: 'var(--text-muted, #71717a)' }} />
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
          {activeTab === 'pending' && localRole !== 'member' && (
            <div className="panelBody scrollable custom-scrollbar">
              <div className="pendingInvitesContainer">
                <h3 className="sectionSubtitle">{t('groups.pendingInvitesTitle') || 'DANH SÁCH LỜI MỜI EMAIL ĐANG CHỜ PHẢN HỒI'}</h3>
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
                    {t('groups.pendingEmpty') || 'Không có lời mời nào đang chờ phản hồi'}
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
                              {t('groups.pendingTag') || '(Đang chờ)'}
                            </span>
                          </div>
                          <div className="email">{invite.email}</div>
                        </div>
                        <div className="roleActions">
                          <span className={`roleBadge ${invite.role}`}>{getRoleLabel(invite.role).toUpperCase()}</span>
                          {actionLoadingId === invite.id ? (
                            <Icons.Refresh size={14} className="spinner" style={{ color: 'var(--text-muted, #71717a)' }} />
                          ) : (
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              title={t('groups.actionRevokeTooltip') || (language === 'en' ? 'Revoke invitation' : 'Hủy lời mời')}
                              className="actionIconBtn kickBtn"
                            >
                              <Icons.Close size={12} />
                            </button>
                          )}
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
                  <h3 className="sectionSubtitle">{t('groups.createInviteTitle') || (language === 'en' ? 'Create Invite Code' : 'Tạo mã mời mới')}</h3>

                  {localRole !== 'member' ? (
                    <form onSubmit={handleCreateInvite} className="createInviteForm">
                      <div className="alertContainer">
                        {createInviteMsg && <div className="alertMsg successMsg">{createInviteMsg}</div>}
                        {createInviteErr && <div className="alertMsg errorMsg">{createInviteErr}</div>}
                      </div>

                      {/* Lượt dùng */}
                      <div className="formField">
                        <div className="formFieldHeader">
                          <label>{t('invite.maxUsesLabel') || (language === 'en' ? 'Maximum uses' : 'Số lượt sử dụng tối đa')}</label>
                          <div className="toggleWrapper">
                            <span className="toggleLabel">{t('invite.unlimited') || (language === 'en' ? 'Unlimited' : 'Không giới hạn')}</span>
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
                            placeholder={t('placeholders.exampleNum') || (language === 'en' ? 'E.g., 10' : 'Ví dụ: 10')}
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
                          <label>{t('invite.expiresLabel') || (language === 'en' ? 'Expiration time' : 'Thời hạn hết hạn')}</label>
                          <div className="toggleWrapper">
                            <span className="toggleLabel">{t('invite.noExpiry') || (language === 'en' ? 'No expiry' : 'Không hết hạn')}</span>
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
                              {t('invite.byHour') || (language === 'en' ? 'By hours' : 'Theo giờ')}
                            </button>
                            <button
                              type="button"
                              className={`expiryTypeTab ${expiryType === 'date' ? 'active' : ''}`}
                              onClick={() => {
                                setExpiryType('date');
                                setExpiresInHours(null);
                              }}
                            >
                              {t('invite.byDay') || (language === 'en' ? 'By date' : 'Theo ngày')}
                            </button>
                          </div>

                          <div className="expiryValueInputContainer">
                            {expiryType === 'hours' ? (
                              <input
                                type="number"
                                min="1"
                                placeholder={t('invite.hoursPlaceholder') || (language === 'en' ? 'Hours (e.g., 24)' : 'Số giờ (ví dụ: 24)')}
                                value={expiresInHours || ''}
                                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || null)}
                                className="no-spinner textInput"
                              />
                            ) : (
                              <CustomDatePicker
                                value={expiresDate}
                                onChange={(val) => setExpiresDate(val)}
                                placeholder={t('invite.datePlaceholder') || (language === 'en' ? 'Select date...' : 'Chọn ngày...')}
                                lang={language === 'en' ? 'en' : 'vi'}
                              />
                            )}
                          </div>
                          {expiryType === 'date' && (
                            <span className="fieldHint">{t('invite.expiryDateHint') || (language === 'en' ? '* Expires at 23:59:59 of the selected date.' : '* Hết hạn vào lúc 23:59:59 của ngày được chọn.')}</span>
                          )}
                        </div>
                      </div>

                      <button type="submit" className="createBtn" disabled={isSubmittingInvite}>
                        {isSubmittingInvite ? (t('buttons.processing') || 'Processing...') : (t('invite.createBtn') || (language === 'en' ? 'Create Invite' : 'Tạo mã mời'))}
                      </button>
                    </form>
                  ) : (
                    <div className="memberInviteInfo">
                      {t('invite.membersOnlyView') || (language === 'en' ? 'Only group administrators can create invite codes.' : 'Chỉ Quản trị viên mới được phép tạo mã mời.')}
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: BẢNG DANH SÁCH MÃ MỜI */}
                <div className="invitesListColumn">
                  <div className="listHeader">
                    <h3 className="sectionSubtitle">{t('groups.createdInvitesTitle') || (language === 'en' ? 'List of created invitations' : 'Danh sách mã mời đã tạo')}</h3>
                    <p className="copyHint">{t('groups.clickToCopyHint') || (language === 'en' ? '* Click on the code to copy it quickly.' : '* Nhấp vào mã mời để sao chép nhanh.')}</p>
                  </div>

                  <div className="invitesTableContainer custom-scrollbar">
                    {invitesLoading && invites.length === 0 ? (
                      <div className="loadingText">{t('sidebar.loading') || (language === 'en' ? 'Loading...' : 'Đang tải...')}</div>
                    ) : invites.length === 0 ? (
                      <div className="emptyInvitesText">{t('invite.emptyList') || (language === 'en' ? 'No invite codes have been created yet.' : 'Chưa có mã mời nào được tạo.')}</div>
                    ) : (
                      <table className="invitesTable">
                        <thead>
                          <tr>
                            <th>{t('groups.tableColCode') || 'Code'}</th>
                            <th>{t('groups.tableColUses') || 'Uses'}</th>
                            <th>{t('groups.tableColExpires') || 'Expires'}</th>
                            <th>{t('groups.tableColStatus') || 'Status'}</th>
                            <th style={{ textAlign: 'center' }}>{t('groups.tableColAction') || 'Action'}</th>
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
                                    {isCurrentlyActive && (
                                      <span className={`copyBtnIcon ${copiedToken === inviteItem.token ? 'copied' : ''}`} style={{ transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center' }}>
                                        {copiedToken === inviteItem.token ? <Icons.Check size={14} style={{ color: '#10b981' }} /> : <Icons.Copy size={13} />}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {inviteItem.uses_count}/{inviteItem.max_uses !== null ? inviteItem.max_uses : '∞'}
                                </td>
                                <td className="expiresCell" title={inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleString() : ''}>
                                  {inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleDateString() : '∞'}
                                </td>
                                <td>
                                  <span className={`statusBadge ${
                                    isCurrentlyActive
                                      ? 'active'
                                      : isLimitReached
                                        ? 'limit-reached'
                                        : isItemExpired
                                          ? 'expired'
                                          : 'locked'
                                  }`}>
                                    {isCurrentlyActive
                                      ? (t('groups.statusActive') || 'Active')
                                      : isLimitReached
                                        ? (t('groups.statusLimitReached') || 'Out of uses')
                                        : isItemExpired
                                          ? (t('groups.statusExpired') || 'Expired')
                                          : (t('groups.statusLocked') || 'Locked')}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {isCurrentlyActive && localRole !== 'member' ? (
                                    <button
                                      className="tableLockBtn"
                                      onClick={() => handleDeactivateInvite(inviteItem.id)}
                                      title={t('actions.lock') || (language === 'en' ? 'Lock code' : 'Khóa mã')}
                                    >
                                      {t('groups.actionLock') || 'Lock'}
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
        .statusBadge.expired {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .statusBadge.limit-reached {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.25);
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
