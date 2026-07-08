'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from '../Icons';
import CustomDatePicker from '../CustomDatePicker';

interface GroupInviteManagerProps {
  groupId: string;
  localRole: 'owner' | 'admin' | 'member';
  api: string;
  addToast: (msg: string, type: 'info' | 'error') => void;
  confirm: (msg: string, options?: any) => Promise<boolean>;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: 'vi' | 'en';
  styles: Record<string, string>;
  onClose: () => void;
  loadData: () => Promise<void>;
}

export default function GroupInviteManager({
  groupId,
  localRole,
  api,
  addToast,
  confirm,
  t,
  language,
  styles,
  onClose,
  loadData
}: GroupInviteManagerProps): React.JSX.Element {
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // States cho Form tạo mã mời
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [expiresDate, setExpiresDate] = useState<string>('');
  const [isUnlimitedUses, setIsUnlimitedUses] = useState<boolean>(true);
  const [isNoExpiry, setIsNoExpiry] = useState<boolean>(true);
  const [expiryType, setExpiryType] = useState<'hours' | 'date'>('hours');

  const [createInviteMsg, setCreateInviteMsg] = useState<string>( '');
  const [createInviteErr, setCreateInviteErr] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState<boolean>(false);

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch(`${api}/api/groups/${groupId}/invitations`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          addToast(t('groups.error.noPermission') || 'Bạn không còn quyền truy cập nhóm này.', 'error');
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

  useEffect(() => {
    if (localRole !== 'member') {
      fetchInvites();
    }
  }, [groupId, localRole]);

  // Listen to realtime updates
  useEffect(() => {
    if (localRole === 'member') return;
    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { metadata } = customEvent.detail || {};
      if (metadata && metadata.groupId === groupId) {
        fetchInvites();
      }
    };
    window.addEventListener('group-update', handleGroupUpdate);
    return () => window.removeEventListener('group-update', handleGroupUpdate);
  }, [groupId, localRole]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInvite) return;
    setCreateInviteMsg('');
    setCreateInviteErr('');

    // Frontend validation
    if (!isUnlimitedUses && (maxUses === null || maxUses <= 0)) {
      setCreateInviteErr(t('invite.validation.maxUsesRequired') || 'Vui lòng nhập số lượt sử dụng tối đa.');
      return;
    }
    if (!isNoExpiry) {
      if (expiryType === 'hours' && (expiresInHours === null || expiresInHours <= 0)) {
        setCreateInviteErr(t('invite.validation.hoursRequired') || 'Vui lòng nhập số giờ hết hạn.');
        return;
      }
      if (expiryType === 'date' && !expiresDate) {
        setCreateInviteErr(t('invite.validation.dateRequired') || 'Vui lòng chọn ngày hết hạn.');
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
      const res = await fetch(`${api}/api/groups/${groupId}/invitations`, {
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
    } finally {
      setIsSubmittingInvite(false);
    }
  };

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

  const copyToClipboard = (token: string, isActive: boolean) => {
    if (!isActive) {
      addToast(t('invite.copyLocked') || 'Mã đã khóa, không thể sử dụng!', 'error');
      return;
    }
    const inviteUrl = `${window.location.origin}/invite/group?code=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    addToast(t('invite.copySuccess', { token }) || 'Đã sao chép liên kết vào clipboard!', 'info');
    setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  };

  return (
    <div className={`${styles.panelBody} ${styles.noScroll}`}>
      <div className={styles.invitesTwoColumnLayout}>

        {/* CỘT TRÁI: TẠO MÃ MỚI */}
        <div className={styles.invitesFormColumn}>
          <h3 className={styles.sectionSubtitle}>{t('groups.createInviteTitle') || 'Tạo mã mời mới'}</h3>

          {localRole !== 'member' ? (
            <form onSubmit={handleCreateInvite} className={styles.createInviteForm}>
              <div className={styles.alertContainer}>
                {createInviteMsg && <div className={`${styles.alertMsg} ${styles.successMsg}`}>{createInviteMsg}</div>}
                {createInviteErr && <div className={`${styles.alertMsg} ${styles.errorMsg}`}>{createInviteErr}</div>}
              </div>

              {/* Lượt dùng */}
              <div className={styles.formField}>
                <div className={styles.formFieldHeader}>
                  <label>{t('invite.maxUsesLabel') || 'Số lượt sử dụng tối đa'}</label>
                  <div className={styles.toggleWrapper}>
                    <span className={styles.toggleLabel}>{t('invite.unlimited') || 'Không giới hạn'}</span>
                    <button
                      type="button"
                      className={`${styles.premiumSwitch} ${isUnlimitedUses ? styles.active : ''}`}
                      onClick={() => {
                        setIsUnlimitedUses(!isUnlimitedUses);
                        if (isUnlimitedUses) setMaxUses(1);
                      }}
                    >
                      <span className={styles.premiumSwitchHandle} />
                    </button>
                  </div>
                </div>
                <div className={`${styles.inputHeightWrapper} ${!isUnlimitedUses ? styles.open : ''}`}>
                  <input
                    type="number"
                    min="1"
                    placeholder={t('placeholders.exampleNum') || 'Ví dụ: 10'}
                    value={maxUses || ''}
                    onChange={(e) => setMaxUses(parseInt(e.target.value) || null)}
                    disabled={isUnlimitedUses}
                    className={`${styles.noSpinner} ${styles.textInput}`}
                  />
                </div>
              </div>

              {/* Hạn dùng */}
              <div className={styles.formField}>
                <div className={styles.formFieldHeader}>
                  <label>{t('invite.expiresLabel') || 'Thời hạn hết hạn'}</label>
                  <div className={styles.toggleWrapper}>
                    <span className={styles.toggleLabel}>{t('invite.noExpiry') || 'Không hết hạn'}</span>
                    <button
                      type="button"
                      className={`${styles.premiumSwitch} ${isNoExpiry ? styles.active : ''}`}
                      onClick={() => setIsNoExpiry(!isNoExpiry)}
                    >
                      <span className={styles.premiumSwitchHandle} />
                    </button>
                  </div>
                </div>
                <div className={`${styles.inputHeightWrapper} ${!isNoExpiry ? styles.open : ''}`}>
                  <div className={styles.expiryTypeTabs}>
                    <button
                      type="button"
                      className={`${styles.expiryTypeTab} ${expiryType === 'hours' ? styles.active : ''}`}
                      onClick={() => { setExpiryType('hours'); setExpiresDate(''); }}
                    >
                      {t('invite.byHour') || 'Theo giờ'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.expiryTypeTab} ${expiryType === 'date' ? styles.active : ''}`}
                      onClick={() => { setExpiryType('date'); setExpiresInHours(null); }}
                    >
                      {t('invite.byDay') || 'Theo ngày'}
                    </button>
                  </div>

                  <div className={styles.expiryValueInputContainer}>
                    {expiryType === 'hours' ? (
                      <input
                        type="number"
                        min="1"
                        placeholder={t('placeholders.exampleNum') || 'Ví dụ: 10'}
                        value={expiresInHours || ''}
                        onChange={(e) => setExpiresInHours(parseInt(e.target.value) || null)}
                        disabled={isNoExpiry}
                        className={`${styles.noSpinner} ${styles.textInput}`}
                      />
                    ) : (
                      <CustomDatePicker
                        value={expiresDate}
                        onChange={setExpiresDate}
                        minDate={todayStr}
                        lang={language}
                      />
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmittingInvite} className={styles.createBtn}>
                {isSubmittingInvite ? '...' : (t('invite.createBtn') || 'Tạo mã')}
              </button>
            </form>
          ) : (
            <div className={styles.memberInviteInfo}>
              {t('invite.memberViewOnly') || 'Chỉ Quản trị viên nhóm mới có quyền tạo mã mời mới.'}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: DANH SÁCH MÃ MỜI ĐÃ TẠO */}
        <div className={styles.invitesListColumn}>
          <div className={styles.listHeader}>
            <h3 className={styles.sectionSubtitle}>{t('groups.activeInvitesTitle') || 'Danh sách mã mời nhóm'}</h3>
            <p className={styles.copyHint}>
              {t('invite.clickToCopyHint') || 'Nhấp vào mã giới hạn màu xanh để sao chép liên kết mời nhanh.'}
            </p>
          </div>

          <div className={styles.invitesTableContainer}>
            {invitesLoading && invites.length === 0 ? (
              <div className={styles.emptyInvitesText}>{t('sidebar.loading') || 'Đang tải...'}</div>
            ) : invites.length === 0 ? (
              <div className={styles.emptyInvitesText}>
                {t('invite.emptyList') || 'Chưa có mã mời nhóm nào được tạo'}
              </div>
            ) : (
              <table className={styles.invitesTable}>
                <thead>
                  <tr>
                    <th>{t('invite.colCode') || 'Mã mời'}</th>
                    <th>{t('invite.colUses') || 'Lượt dùng'}</th>
                    <th>{t('invite.colExpiry') || 'Hết hạn'}</th>
                    <th>{t('invite.colStatus') || 'Trạng thái'}</th>
                    <th style={{ textAlign: 'center' }}>{t('invite.colAction') || 'Hành động'}</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inviteItem) => {
                    const isItemExpired = inviteItem.expires_at && new Date(inviteItem.expires_at) < new Date();
                    const isLimitReached = inviteItem.max_uses !== null && inviteItem.uses_count >= inviteItem.max_uses;
                    const isCurrentlyActive = inviteItem.is_active && !isItemExpired && !isLimitReached;

                    return (
                      <tr key={inviteItem.id} className={isCurrentlyActive ? styles.rowActive : styles.rowLocked}>
                        <td>
                          <div
                            className={styles.tokenCell}
                            onClick={() => copyToClipboard(inviteItem.token, isCurrentlyActive)}
                            title={isCurrentlyActive ? t('invite.titleCopyActive') : t('invite.titleCopyLocked')}
                          >
                            <span className={styles.tokenText}>{inviteItem.token}</span>
                            {isCurrentlyActive && (
                              <span className={`${styles.copyBtnIcon} ${copiedToken === inviteItem.token ? styles.copied : ''}`} style={{ transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center' }}>
                                {copiedToken === inviteItem.token ? <Icons.Check size={14} style={{ color: '#10b981' }} /> : <Icons.Copy size={13} />}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {inviteItem.uses_count}/{inviteItem.max_uses !== null ? inviteItem.max_uses : '∞'}
                        </td>
                        <td className={styles.expiresCell} title={inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleString() : ''}>
                          {inviteItem.expires_at ? new Date(inviteItem.expires_at).toLocaleDateString() : '∞'}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${
                            isCurrentlyActive
                              ? styles.active
                              : isLimitReached
                                ? styles.limitReached
                                : isItemExpired
                                  ? styles.expired
                                  : styles.locked
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
                              className={styles.tableLockBtn}
                              onClick={() => handleDeactivateInvite(inviteItem.id)}
                              title={t('actions.lock') || 'Khóa mã'}
                            >
                              {t('groups.actionLock') || 'Lock'}
                            </button>
                          ) : (
                            <span className={styles.lockedPlaceholder}>-</span>
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
  );
}
