'use client';

import React, { useEffect, useState } from 'react';
import { getApiOrigin } from '../../lib/utils';

interface InvitationDetails {
  id: string;
  token: string;
  groupId: string;
  groupName: string;
  createdByName: string;
  memberCount: number;
  userStatus: 'none' | 'joined' | 'declined';
}

interface InteractiveProps {
  invitation: InvitationDetails;
  allowPublicSignup: boolean;
  actionLoading: boolean;
  handleAccept: () => void;
  handleDecline: () => void;
  language: 'vi' | 'en';
  router: any;
}

export default function InviteGroupInteractive({
  invitation,
  allowPublicSignup,
  actionLoading,
  handleAccept,
  handleDecline,
  language,
  router
}: InteractiveProps): React.JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const apiOrigin = getApiOrigin();

  useEffect(() => {
    // Check xem user đã đăng nhập chưa
    fetch(`${apiOrigin}/api/auth/me`, { credentials: 'include' })
      .then(res => {
        setIsLoggedIn(res.ok);
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, [apiOrigin]);

  if (isLoggedIn === null) {
    return (
      <div className="invite-container">
        <div className="invite-card loading-card">
          <div className="spinner" />
          <p>{language === 'vi' ? 'Đang xác thực tài khoản...' : 'Authenticating...'}</p>
        </div>
      </div>
    );
  }

  // Trường hợp 1 & 2: Chưa đăng nhập
  if (!isLoggedIn) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
    const loginRedirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
    const registerRedirectUrl = `/login?register=true&redirect=${encodeURIComponent(currentPath)}`;

    return (
      <div className="invite-container">
        <div className="invite-card auth-required-card">
          <div className="group-avatar">👪</div>
          <h2>{language === 'vi' ? 'Lời mời tham gia nhóm' : 'Group Invitation'}</h2>
          <p className="invite-desc">
            {language === 'vi' 
              ? `Bạn nhận được lời mời tham gia nhóm "${invitation.groupName}" từ thành viên ${invitation.createdByName}.`
              : `You have been invited to join "${invitation.groupName}" by ${invitation.createdByName}.`}
          </p>
          <div className="auth-prompt-box">
            <p className="prompt-text">
              {language === 'vi'
                ? 'Để chấp nhận lời mời, vui lòng đăng nhập vào tài khoản của bạn.'
                : 'To accept this invitation, please log in to your account.'}
            </p>
            
            <div className="auth-buttons">
              <button 
                className="primary-btn" 
                onClick={() => router.push(loginRedirectUrl)}
              >
                🔑 {language === 'vi' ? 'Đăng nhập ngay' : 'Log In Now'}
              </button>

              {allowPublicSignup ? (
                <button 
                  className="secondary-btn" 
                  onClick={() => router.push(registerRedirectUrl)}
                >
                  📝 {language === 'vi' ? 'Đăng ký tài khoản mới' : 'Register New Account'}
                </button>
              ) : (
                <div className="signup-disabled-hint">
                  🔒 {language === 'vi' ? 'Đăng ký tài khoản công khai hiện đang bị tắt.' : 'Public registration is currently disabled.'}
                </div>
              )}
            </div>
          </div>
          
          <button className="text-btn" onClick={handleDecline}>
            {language === 'vi' ? 'Từ chối lời mời' : 'Decline Invitation'}
          </button>
        </div>
      </div>
    );
  }

  // Trường hợp 3: Đã đăng nhập
  return (
    <div className="invite-container">
      <div className="invite-card action-card">
        <div className="group-avatar-active">🤝</div>
        <h2>{language === 'vi' ? 'Xác nhận gia nhập nhóm' : 'Confirm Joining Group'}</h2>
        <p className="invite-desc">
          {language === 'vi' 
            ? `Bạn đang chuẩn bị gia nhập nhóm "${invitation.groupName}".`
            : `You are about to join "${invitation.groupName}".`}
        </p>

        <div className="group-details-box">
          <div className="detail-row">
            <span className="label">{language === 'vi' ? 'Người mời' : 'Inviter'}:</span>
            <span className="value">{invitation.createdByName}</span>
          </div>
          <div className="detail-row">
            <span className="label">{language === 'vi' ? 'Thành viên hiện tại' : 'Current members'}:</span>
            <span className="value">{invitation.memberCount}</span>
          </div>
        </div>

        <div className="action-buttons-row">
          <button 
            className="accept-btn" 
            onClick={handleAccept} 
            disabled={actionLoading}
          >
            {actionLoading ? '...' : (language === 'vi' ? 'Đồng ý gia nhập' : 'Accept Invitation')}
          </button>
          <button 
            className="decline-btn" 
            onClick={handleDecline} 
            disabled={actionLoading}
          >
            {language === 'vi' ? 'Từ chối' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}
