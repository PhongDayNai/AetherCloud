'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CustomDatePicker from '../CustomDatePicker';

interface User {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
  mustChangePassword: boolean;
  avatarUrl?: string;
}

interface Invitation {
  id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AdminInvitationsProps {
  api: string;
  user: User | null;
  language: 'vi' | 'en';
  addToast: (msg: string, type: 'info' | 'error') => void;
  confirm: (msg: string, options?: any) => Promise<boolean>;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function AdminInvitations({
  api,
  user,
  language,
  addToast,
  confirm,
  t
}: AdminInvitationsProps): React.JSX.Element | null {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [maxUsesInput, setMaxUsesInput] = useState<number | string>(1);
  const [isUnlimitedUses, setIsUnlimitedUses] = useState<boolean>(false);
  const [expiresType, setExpiresType] = useState<'hours' | 'date'>('hours');
  const [expiresInHoursInput, setExpiresInHoursInput] = useState<number | string>('');
  const [expiresDateInput, setExpiresDateInput] = useState<string>('');
  const [createInviteMsg, setCreateInviteMsg] = useState<string>('');

  useEffect(() => {
    if (createInviteMsg) {
      const timer = setTimeout(() => setCreateInviteMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [createInviteMsg]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadInvitations();
    }
  }, [user]);

  async function loadInvitations() {
    try {
      const res = await fetch(`${api}/api/admin/invitations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Không tải được danh sách mã mời:', err);
    }
  }

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  async function handleCreateInvitation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateInviteMsg('');
    try {
      const body: any = {
        max_uses: isUnlimitedUses ? 0 : (maxUsesInput ? parseInt(String(maxUsesInput), 10) : 1)
      };
      if (expiresType === 'hours') {
        if (expiresInHoursInput) {
          body.expires_in_hours = parseInt(String(expiresInHoursInput), 10);
        }
      } else if (expiresType === 'date') {
        if (expiresDateInput) {
          const dateObj = new Date(`${expiresDateInput}T23:59:59`);
          body.expires_at = dateObj.toISOString();
        }
      }
      const res = await fetch(`${api}/api/admin/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setCreateInviteMsg(t('invite.createSuccess'));
        setMaxUsesInput(1);
        setIsUnlimitedUses(false);
        setExpiresInHoursInput('');
        setExpiresDateInput('');
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateInviteMsg(`${t('messages.error')}: ${data.message || t('invite.createError')}`);
      }
    } catch (err: any) {
      setCreateInviteMsg(`${t('messages.error')}: ${err.message}`);
    }
  }

  async function handleDeactivateInvitation(id: string) {
    if (!await confirm(t('invite.confirmLock'), { isDanger: true })) return;
    try {
      const res = await fetch(`${api}/api/admin/invitations/${id}/deactivate`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (res.ok) {
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`${t('messages.error')}: ${data.message}`);
      }
    } catch (err: any) {
      alert(`${t('messages.error')}: ${err.message}`);
    }
  }

  if (user?.role !== 'admin') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'visible', animation: 'tabSlideIn 0.2s ease-out' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: 'var(--text-primary)', fontWeight: '600' }}>{t('invite.title')}</h3>
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'visible' }}>
        {/* Cột trái: Form tạo mã mời */}
        <div style={{
          width: '180px',
          display: 'flex',
          flexDirection: 'column',
          paddingRight: '24px',
          borderRight: '1px solid var(--border-color)',
          boxSizing: 'border-box',
          justifyContent: 'center'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{t('invite.createTitle')}</h4>
          <form onSubmit={handleCreateInvitation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('invite.maxUses')}</label>
              
              {/* Premium Switch Toggle */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}>
                <div style={{
                  width: '28px',
                  height: '16px',
                  backgroundColor: isUnlimitedUses ? '#4f46e5' : 'var(--border-input)',
                  borderRadius: '99px',
                  padding: '2px',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isUnlimitedUses ? 'flex-end' : 'flex-start',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }} />
                </div>
                <input 
                  type="checkbox" 
                  checked={isUnlimitedUses} 
                  onChange={(e) => {
                    setIsUnlimitedUses(e.target.checked);
                    if (e.target.checked) setMaxUsesInput('');
                    else setMaxUsesInput(1);
                  }}
                  style={{ display: 'none' }}
                />
                <span>{t('invite.unlimited')}</span>
              </label>
              
              <input 
                type="number" 
                min="1" 
                placeholder={isUnlimitedUses ? '∞' : '1'}
                disabled={isUnlimitedUses}
                value={isUnlimitedUses ? '' : maxUsesInput} 
                onChange={(e) => setMaxUsesInput(e.target.value)} 
                required={!isUnlimitedUses}
                className="no-spinner"
                style={{ width: '100%', background: isUnlimitedUses ? 'var(--bg-item-hover)' : 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '7px 10px', color: isUnlimitedUses ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box', opacity: isUnlimitedUses ? 0.6 : 1 }}
                onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('invite.expiry')}</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => { setExpiresType('hours'); setExpiresDateInput(''); }}
                  style={{
                    flex: 1,
                    background: expiresType === 'hours' ? 'var(--bg-item-active)' : 'transparent',
                    border: '1px solid var(--border-input)',
                    borderRadius: '4px',
                    color: expiresType === 'hours' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '5px 0',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t('invite.byHour')}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setExpiresType('date'); setExpiresInHoursInput(''); }}
                  style={{
                    flex: 1,
                    background: expiresType === 'date' ? 'var(--bg-item-active)' : 'transparent',
                    border: '1px solid var(--border-input)',
                    borderRadius: '4px',
                    color: expiresType === 'date' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '5px 0',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t('invite.byDay')}
                </button>
              </div>
              
              {expiresType === 'hours' ? (
                <input 
                  key="hours-input"
                  type="number" 
                  min="1" 
                  placeholder={t('invite.noExpiry')}
                  value={expiresInHoursInput} 
                  onChange={(e) => setExpiresInHoursInput(e.target.value)} 
                  className="no-spinner tab-content-fade"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box' }}
                  onFocus={(e: any) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                  onBlur={(e: any) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
                />
              ) : (
                <div key="date-input" className="tab-content-fade">
                  <CustomDatePicker 
                    value={expiresDateInput} 
                    onChange={setExpiresDateInput} 
                    minDate={todayStr}
                    lang={language}
                  />
                  <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: '1.4' }}>
                    {t('invite.expiryDateHint')}
                  </span>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              style={{
                background: 'var(--button-primary-bg)',
                color: 'var(--button-primary-text)',
                border: 0,
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
                marginTop: '4px',
                boxShadow: '0 4px 12px var(--button-primary-shadow)'
              }}
              onMouseEnter={(e: any) => { e.target.style.opacity = '0.9'; }}
              onMouseLeave={(e: any) => { e.target.style.opacity = '1'; }}
            >
              {t('invite.createBtn')}
            </button>

            <div style={{
              maxHeight: createInviteMsg ? '80px' : '0px',
              opacity: createInviteMsg ? 1 : 0,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden',
              marginTop: createInviteMsg ? '8px' : '0px'
            }}>
              <div style={{
                fontSize: '11.5px',
                color: createInviteMsg?.startsWith(t('messages.error')) ? '#fca5a5' : '#a7f3d0',
                padding: '6px 10px',
                borderRadius: '6px',
                background: createInviteMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${createInviteMsg?.startsWith(t('messages.error')) ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`,
                wordBreak: 'break-word'
              }}>
                {createInviteMsg}
              </div>
            </div>
          </form>
        </div>

        {/* Cột phải: Danh sách mã mời */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <h4 style={{ margin: '0', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{t('invite.listTitle')}</h4>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '12px', lineHeight: '1.4' }}>
            {t('invite.clickToCopyHint')}
          </div>
          <div style={{
            flex: 1,
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflowY: 'auto',
            background: 'var(--bg-input)',
            overflowX: 'hidden'
          }}>
            {invitations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                {t('invite.emptyList')}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-item-hover)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colCode')}</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colUses')}</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colExpiry')}</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('invite.colStatus')}</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'right' }}>{t('invite.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                    const isActive = inv.is_active && !isExpired && (inv.max_uses === null || inv.uses_count < inv.max_uses);
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="tableRowHover">
                        <td 
                          onClick={() => {
                            if (isActive) {
                              navigator.clipboard.writeText(inv.token);
                              addToast(t('invite.copySuccess', { token: inv.token }) || `Copied link: ${inv.token}`, 'info');
                            } else {
                              addToast(t('invite.copyLocked') || 'Invite code is locked!', 'error');
                            }
                          }}
                          title={isActive ? t('invite.titleCopyActive') : t('invite.titleCopyLocked')}
                          style={{ 
                            padding: '8px 10px', 
                            fontWeight: '700', 
                            color: isActive ? '#3b82f6' : 'var(--text-muted)', 
                            fontFamily: 'monospace', 
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textDecoration: isActive ? 'none' : 'line-through'
                          }}
                          onMouseEnter={(e: any) => { if (isActive) e.currentTarget.style.color = '#60a5fa'; }}
                          onMouseLeave={(e: any) => { if (isActive) e.currentTarget.style.color = '#3b82f6'; }}
                        >
                          {inv.token}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{inv.uses_count}/{inv.max_uses || '∞'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('vi-VN') : t('invite.noExpiry')}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {isActive ? (
                            <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>{t('invite.statusActive')}</span>
                          ) : (
                            <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>{t('invite.statusLocked')}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {isActive && (
                            <button 
                              onClick={() => handleDeactivateInvitation(inv.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(244, 63, 94, 0.25)',
                                color: '#f43f5e',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e: any) => { e.target.style.background = 'rgba(244, 63, 94, 0.06)'; e.target.style.borderColor = '#f43f5e'; }}
                              onMouseLeave={(e: any) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(244, 63, 94, 0.25)'; }}
                            >
                              {t('invite.actionLock')}
                            </button>
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
