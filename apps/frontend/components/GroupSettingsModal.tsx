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
  const { t } = useLanguage();
  const { api, user, addToast, loadData } = useCloud();
  const confirm = useConfirm();

  // Tab State
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');

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
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [expiresDate, setExpiresDate] = useState<string>('');
  const [isUnlimitedUses, setIsUnlimitedUses] = useState<boolean>(true);
  const [isNoExpiry, setIsNoExpiry] = useState<boolean>(true);

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
      setCreateInviteMsg('');
      setCreateInviteErr('');
      setCopiedToken(null);
    }
  }, [isOpen, group]);

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

  // Mời trực tiếp qua Email dạng Notification
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
        throw new Error(data.message || t('groups.inviteFailed') || 'Mời thành viên thất bại');
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
        expiresInHours: isNoExpiry ? null : (expiresInHours || null),
        expiresDate: isNoExpiry ? null : (expiresDate || null)
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
        <div className="modalHeader">
          <h2>{group.name} - {t('groups.settingsTitle') || 'Thiết lập nhóm'}</h2>
          <button className="closeBtn" onClick={onClose}>✕</button>
        </div>

        {/* Tab Headers */}
        <div className="tabHeaders">
          <button
            className={`tabHeader ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            👥 {t('groups.membersTab') || 'Thành viên'}
          </button>
          <button
            className={`tabHeader ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            ✉️ {t('groups.invitesTab') || 'Mã mời nhóm'}
          </button>
        </div>

        {/* TAB 1: THÀNH VIÊN */}
        {activeTab === 'members' && (
          <div className="tabContent">
            {/* Form mời thành viên cho Owner và Admin */}
            {myRole !== 'member' && (
              <form onSubmit={handleInviteEmailDirect} className="inviteForm">
                {errorMsg && <div className="errorBanner">{errorMsg}</div>}
                <div className="inviteRow">
                  <input
                    type="text"
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
            <div className="membersContainer custom-scrollbar">
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
                            {isMe && <span className="meTag">(Tôi)</span>}
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

        {/* TAB 2: MÃ MỜI NHÓM */}
        {activeTab === 'invites' && (
          <div className="tabContent invitesTab">
            {/* Chỉ Owner và Admin mới được tạo mã mời */}
            {myRole !== 'member' ? (
              <form onSubmit={handleCreateInvite} className="createInviteForm">
                {/* Alert Messages Container */}
                <div className="alertContainer">
                  {createInviteMsg && <div className="alertMsg successMsg">{createInviteMsg}</div>}
                  {createInviteErr && <div className="alertMsg errorMsg">{createInviteErr}</div>}
                </div>

                <div className="inviteSettingsGrid">
                  {/* Cấu hình lượt sử dụng */}
                  <div className="formField">
                    <label>{t('invite.maxUsesLabel') || 'Số lượt sử dụng tối đa'}</label>
                    <div className="toggleWrapper">
                      <span className="toggleLabel">{t('invite.unlimited') || 'Không giới hạn'}</span>
                      <button
                        type="button"
                        className={`premiumSwitch ${isUnlimitedUses ? 'active' : ''}`}
                        onClick={() => {
                          setIsUnlimitedUses(!isUnlimitedUses);
                          if (isUnlimitedUses) setMaxUses(10);
                        }}
                      >
                        <span className="premiumSwitchHandle" />
                      </button>
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

                  {/* Cấu hình thời hạn hết hạn */}
                  <div className="formField">
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

                    <div className={`inputHeightWrapper ${!isNoExpiry ? 'open' : ''}`}>
                      <div className="expiryInputs">
                        <input
                          type="number"
                          min="1"
                          placeholder={t('invite.hoursPlaceholder') || 'Số giờ (ví dụ: 24)'}
                          value={expiresInHours || ''}
                          onChange={(e) => {
                            setExpiresInHours(parseInt(e.target.value) || null);
                            if (e.target.value) setExpiresDate('');
                          }}
                          disabled={isNoExpiry}
                          className="no-spinner textInput"
                        />
                        <span className="expiryDivider">{t('invite.or') || 'hoặc'}</span>
                        <CustomDatePicker
                          value={expiresDate}
                          onChange={(val) => {
                            setExpiresDate(val);
                            if (val) setExpiresInHours(null);
                          }}
                          disabled={isNoExpiry}
                          placeholder={t('invite.datePlaceholder') || 'Chọn ngày...'}
                        />
                      </div>
                      <span className="fieldHint">{t('invite.expiryDateHint') || '* Hết hạn vào lúc 23:59:59 của ngày được chọn.'}</span>
                    </div>
                  </div>
                </div>

                <button type="submit" className="createBtn">
                  {t('invite.createBtn') || 'Tạo mã mời mới'}
                </button>
              </form>
            ) : (
              <div className="memberInviteInfo">
                {t('invite.membersOnlyView') || 'Chỉ Quản trị viên mới được phép tạo mã mời.'}
              </div>
            )}

            {/* Tiêu đề & Hướng dẫn sao chép nhanh */}
            <div className="listHeader">
              <h3>{t('invite.listTitle') || 'Danh sách mã mời đã tạo'}</h3>
              <p className="copyHint">{t('invite.clickToCopyHint') || '* Nhấp vào mã mời để sao chép nhanh.'}</p>
            </div>

            {/* Danh sách mã mời nhóm đã tạo */}
            <div className="invitesTableContainer custom-scrollbar">
              {invitesLoading && invites.length === 0 ? (
                <div className="loadingText">{t('sidebar.loading') || 'Đang tải...'}</div>
              ) : invites.length === 0 ? (
                <div className="emptyInvitesText">{t('invite.emptyList') || 'Chưa có mã mời nào được tạo.'}</div>
              ) : (
                <div className="invitesList">
                  {invites.map((inviteItem) => {
                    const isItemExpired = inviteItem.expires_at ? new Date(inviteItem.expires_at) < new Date() : false;
                    const isLimitReached = inviteItem.max_uses ? inviteItem.uses_count >= inviteItem.max_uses : false;
                    const isCurrentlyActive = inviteItem.is_active && !isItemExpired && !isLimitReached;

                    return (
                      <div key={inviteItem.id} className={`inviteItemRow ${isCurrentlyActive ? 'active' : 'locked'}`}>
                        <div
                          className="inviteTokenCell"
                          onClick={() => copyToClipboard(inviteItem.token, isCurrentlyActive)}
                          title={isCurrentlyActive ? t('invite.titleCopyActive') : t('invite.titleCopyLocked')}
                        >
                          <span className="tokenText">{inviteItem.token}</span>
                          {isCurrentlyActive && <span className="copyBtnIcon">📋</span>}
                        </div>

                        <div className="inviteMetaCell">
                          <div className="metaRow">
                            <span className="label">{t('invite.uses') || 'Sử dụng'}:</span>
                            <span className="val">
                              {inviteItem.uses_count} / {inviteItem.max_uses !== null ? inviteItem.max_uses : '∞'}
                            </span>
                          </div>
                          <div className="metaRow">
                            <span className="label">{t('invite.expires') || 'Hết hạn'}:</span>
                            <span className="val expiresVal">
                              {inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleString() : '∞'}
                            </span>
                          </div>
                        </div>

                        <div className="inviteStatusCell">
                          <span className={`statusBadge ${isCurrentlyActive ? 'active' : 'locked'}`}>
                            {isCurrentlyActive ? (t('invite.statusActive') || 'Hoạt động') : (t('invite.statusLocked') || 'Bị khóa')}
                          </span>

                          {isCurrentlyActive && myRole !== 'member' && (
                            <button
                              className="lockInviteBtn"
                              onClick={() => handleDeactivateInvite(inviteItem.id)}
                              title={t('actions.lock') || 'Khóa mã'}
                            >
                              🔒
                            </button>
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
          max-width: 500px;
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
          margin-bottom: 12px;
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

        /* Tab Headers UI */
        .tabHeaders {
          display: flex;
          gap: 6px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .tabHeader {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 600;
          padding: 10px 0;
          cursor: pointer;
          position: relative;
          transition: color 0.25s;
          font-family: inherit;
        }
        .tabHeader:hover {
          color: var(--text-primary);
        }
        .tabHeader.active {
          color: var(--accent-color, #3b82f6);
        }
        .tabHeader.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-color, #3b82f6);
          border-radius: 99px;
        }

        .tabContent {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
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
          max-height: 380px;
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
          animation: memberRowFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes memberRowFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .memberRow.leaving {
          animation: memberRowFadeOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
          border-bottom: 0;
          pointer-events: none;
        }
        @keyframes memberRowFadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
            max-height: 80px;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          to {
            opacity: 0;
            transform: translateY(-8px);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
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
        .spinner {
          font-size: 14px;
          animation: spin 1s linear infinite;
        }

        /* INVITATIONS TAB STYLING */
        .invitesTab {
          max-height: 480px;
          display: flex;
          flex-direction: column;
        }
        .createInviteForm {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .alertContainer {
          flex-shrink: 0;
        }
        .alertMsg {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: slideDownIn 0.3s ease-out forwards;
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
        .inviteSettingsGrid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .formField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .formField label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .toggleWrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          padding: 6px 10px;
        }
        .toggleLabel {
          font-size: 13px;
          color: var(--text-primary);
        }
        .premiumSwitch {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-input);
          width: 38px;
          height: 20px;
          border-radius: 99px;
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        .premiumSwitch.active {
          background: var(--accent-color, #3b82f6);
          border-color: var(--accent-color);
        }
        .premiumSwitchHandle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 50%;
          left: 3px;
          transform: translateY(-50%);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premiumSwitch.active .premiumSwitchHandle {
          left: calc(100% - 17px);
        }
        
        .inputHeightWrapper {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          visibility: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .inputHeightWrapper.open {
          max-height: 90px;
          opacity: 1;
          visibility: visible;
          padding-top: 4px;
        }
        .textInput {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
        .textInput:focus {
          border-color: var(--border-input-focus);
          background: var(--bg-input-focus);
        }
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .expiryInputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .expiryInputs .textInput {
          flex: 1;
        }
        .expiryDivider {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .fieldHint {
          font-size: 11px;
          color: var(--text-muted);
          font-style: italic;
        }
        .createBtn {
          background: var(--button-primary-bg);
          border: none;
          color: var(--button-primary-text);
          border-radius: 8px;
          padding: 10px 0;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          text-align: center;
          box-shadow: 0 2px 10px rgba(255, 255, 255, 0.05);
        }
        .createBtn:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .memberInviteInfo {
          text-align: center;
          padding: 20px;
          font-size: 13px;
          color: var(--text-muted);
          border: 1px dashed var(--border-input);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          margin-bottom: 16px;
        }

        .listHeader {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .listHeader h3 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .copyHint {
          margin: 0;
          font-size: 11px;
          color: var(--text-muted);
        }

        .invitesTableContainer {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          max-height: 200px;
          padding: 4px;
        }
        .emptyInvitesText {
          text-align: center;
          padding: 24px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .invitesList {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .inviteItemRow {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s ease;
          border-radius: 8px;
        }
        .inviteItemRow:last-child {
          border-bottom: none;
        }
        .inviteItemRow:hover {
          background: var(--bg-item-hover);
        }
        .inviteItemRow.locked {
          opacity: 0.6;
        }
        .inviteTokenCell {
          background: var(--bg-item-active);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: monospace;
          font-weight: 700;
          font-size: 12px;
          color: var(--text-primary);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .inviteItemRow.active .inviteTokenCell:hover {
          border-color: var(--accent-color, #3b82f6);
          background: rgba(59, 130, 246, 0.1);
        }
        .copyBtnIcon {
          font-size: 11px;
        }
        .inviteMetaCell {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .metaRow {
          display: flex;
          gap: 4px;
          font-size: 10.5px;
          line-height: 1.2;
        }
        .metaRow .label {
          color: var(--text-muted);
        }
        .metaRow .val {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .expiresVal {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .inviteStatusCell {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .statusBadge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .statusBadge.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .statusBadge.locked {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .lockInviteBtn {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          cursor: pointer;
          font-size: 11px;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          padding: 0;
        }
        .lockInviteBtn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.35);
          transform: scale(1.05);
        }

        .modalFooter {
          display: flex;
          justify-content: flex-end;
          flex-shrink: 0;
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
          margin-top: 8px;
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

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
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
        @keyframes slideDownIn {
          from {
            opacity: 0;
            max-height: 0;
            padding: 0 12px;
            margin-bottom: 0;
          }
          to {
            opacity: 1;
            max-height: 60px;
            padding: 8px 12px;
            margin-bottom: 12px;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
