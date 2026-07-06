'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiOrigin } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

interface InvitationDetails {
  id: string;
  token: string;
  groupId: string;
  groupName: string;
  createdByName: string;
  memberCount: number;
  userStatus: 'none' | 'joined' | 'declined';
}

function InviteGroupContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const apiOrigin = getApiOrigin();

  const code = searchParams.get('code') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [allowPublicSignup, setAllowPublicSignup] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isDeclined, setIsDeclined] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const isJoined = invitation && invitation.userStatus === 'joined';
    const isDeclinedState = isDeclined || (invitation && invitation.userStatus === 'declined');

    if (isJoined || isDeclinedState) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (isJoined) {
              window.location.href = `/cloud/group/${invitation.groupId}/dashboard`;
            } else {
              window.location.href = '/cloud/dashboard';
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [invitation, isDeclined]);

  useEffect(() => {
    if (!code) {
      setError(language === 'vi' ? 'Thiếu mã mời gia nhập nhóm.' : 'Missing group invitation code.');
      setLoading(false);
      return;
    }

    // Kiểm tra xem mã này đã từng bị từ chối và ghi lại ở localStorage chưa
    const declinedInvites = JSON.parse(localStorage.getItem('declined_group_invites') || '[]');
    if (declinedInvites.includes(code)) {
      setIsDeclined(true);
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`${apiOrigin}/api/groups/invitations/${code}`, { credentials: 'include' });
        const data = await res.json();
        
        if (!res.ok || !data.ok) {
          if (data.code === 'INVITATION_NOT_FOUND') {
            throw new Error(t('groups.error.invitationNotFound') || 'Liên kết mời này không tồn tại hoặc đã bị hủy bỏ.');
          }
          if (data.code === 'INVITATION_EXPIRED_OR_LIMIT_REACHED') {
            throw new Error(t('groups.error.invitationExpiredOrLimitReached') || 'Liên kết mời này đã hết hạn hoặc đạt giới hạn lượt sử dụng.');
          }
          throw new Error(data.message || (language === 'vi' ? 'Liên kết mời không hợp lệ hoặc đã hết hạn.' : 'Invalid or expired invitation link.'));
        }

        const mappedInvitation: InvitationDetails = {
          id: data.invite_id,
          token: code,
          groupId: data.group.id,
          groupName: data.group.name,
          createdByName: data.group.owner_name,
          memberCount: data.group.member_count,
          userStatus: data.userStatus
        };

        setInvitation(mappedInvitation);
        setAllowPublicSignup(data.allowPublicSignup ?? true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [code, apiOrigin, router, language]);

  // Chấp nhận lời mời
  const handleAccept = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiOrigin}/api/groups/invitations/${code}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.code === 'INVITATION_NOT_FOUND') {
          throw new Error(t('groups.error.invitationNotFound') || 'Liên kết mời này không tồn tại hoặc đã bị hủy bỏ.');
        }
        if (data.code === 'INVITATION_EXPIRED_OR_LIMIT_REACHED') {
          throw new Error(t('groups.error.invitationExpiredOrLimitReached') || 'Liên kết mời này đã hết hạn hoặc đạt giới hạn lượt sử dụng.');
        }
        throw new Error(data.message || 'Chấp nhận lời mời thất bại');
      }
      // Điều hướng tới dashboard nhóm
      window.location.href = `/cloud/group/${invitation.groupId}/dashboard`;
    } catch (err: any) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  // Từ chối lời mời
  const handleDecline = async () => {
    if (!code) return;
    
    // Lưu vào localStorage
    const declinedInvites = JSON.parse(localStorage.getItem('declined_group_invites') || '[]');
    if (!declinedInvites.includes(code)) {
      declinedInvites.push(code);
      localStorage.setItem('declined_group_invites', JSON.stringify(declinedInvites));
    }
    
    setIsDeclined(true);
    
    // Nếu đã đăng nhập, thông báo cho Backend ghi nhận từ chối
    try {
      await fetch(`${apiOrigin}/api/groups/invitations/${code}/decline`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Failed to notify backend about decline:', e);
    }
    
    // Sau 2 giây tự động chuyển hướng về dashboard cá nhân
    setTimeout(() => {
      window.location.href = '/cloud/dashboard';
    }, 2000);
  };

  if (loading) {
    return (
      <div className="invite-container">
        <div className="invite-card loading-card">
          <div className="spinner" />
          <p>{language === 'vi' ? 'Đang tải thông tin lời mời...' : 'Loading invitation details...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-container">
        <div className="invite-card error-card">
          <div className="error-icon">❌</div>
          <h2>{language === 'vi' ? 'Liên kết không khả dụng' : 'Link Unavailable'}</h2>
          <p className="error-text">{error}</p>
          <button className="primary-btn" onClick={() => { window.location.href = '/cloud/dashboard'; }}>
            {language === 'vi' ? 'Quay lại Trang chủ' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  if (isDeclined || (invitation && invitation.userStatus === 'declined')) {
    return (
      <div className="invite-container">
        <div className="invite-card decline-card relative-card">
          <div className="info-icon">ℹ️</div>
          <h2>{language === 'vi' ? 'Đã từ chối lời mời' : 'Invitation Declined'}</h2>
          <p className="invite-desc-already">
            {language === 'vi' 
              ? 'Bạn đã từ chối tham gia nhóm này.' 
              : 'You declined to join this group.'}
          </p>
          <span className="countdown-hint">
            {language === 'vi' 
              ? `Đang tự động chuyển hướng sau ${countdown} giây...` 
              : `Redirecting in ${countdown}s...`}
          </span>
          <div className="countdown-progress-bar" />
        </div>
      </div>
    );
  }

  if (invitation && invitation.userStatus === 'joined') {
    return (
      <div className="invite-container">
        <div className="invite-card success-card relative-card">
          <div className="success-icon">🎉</div>
          <h2>{language === 'vi' ? 'Bạn đã là thành viên' : 'Already a Member'}</h2>
          <p className="invite-desc-already">
            {language === 'vi' 
              ? `Bạn đã là thành viên của nhóm "${invitation.groupName}".` 
              : `You are already a member of "${invitation.groupName}".`}
          </p>
          <span className="countdown-hint">
            {language === 'vi' 
              ? `Đang tự động chuyển hướng sau ${countdown} giây...` 
              : `Redirecting in ${countdown}s...`}
          </span>
          <div className="countdown-progress-bar" />
        </div>
      </div>
    );
  }

  // Nếu người dùng chưa đăng nhập (invitation là null hoặc userStatus chưa xác định được hoặc server trả về 401 cho /auth/me)
  // Thực tế, API /invitations/:token cho phép khách (chưa đăng nhập) lấy thông tin chi tiết. 
  // Nhưng để chấp nhận gia nhập thì bắt buộc phải đăng nhập.
  // Ở đây, ta kiểm tra xem userStatus trong DB có phải là 'none' hay không. 
  // Nếu họ chưa đăng nhập, ở context ta có thể check, hoặc trong page này ta có một flag checkLoginState.
  // Ta có thể gọi API /api/auth/me để chắc chắn họ đã đăng nhập.
  return (
    <InviteGroupInteractive 
      invitation={invitation!} 
      allowPublicSignup={allowPublicSignup} 
      actionLoading={actionLoading} 
      handleAccept={handleAccept} 
      handleDecline={handleDecline} 
      language={language}
      router={router}
    />
  );
}

// Subcomponent quản lý tương tác và check auth
interface InteractiveProps {
  invitation: InvitationDetails;
  allowPublicSignup: boolean;
  actionLoading: boolean;
  handleAccept: () => void;
  handleDecline: () => void;
  language: 'vi' | 'en';
  router: any;
}

function InviteGroupInteractive({
  invitation,
  allowPublicSignup,
  actionLoading,
  handleAccept,
  handleDecline,
  language,
  router
}: InteractiveProps) {
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

export default function InviteGroupPage() {
  return (
    <Suspense fallback={
      <div className="invite-container">
        <div className="invite-card loading-card">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <InviteGroupContent />
      <style dangerouslySetInnerHTML={{
        __html: `
          .invite-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #09090b;
            background-image: 
              radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
              radial-gradient(at 100% 100%, rgba(37, 99, 235, 0.08) 0px, transparent 50%),
              linear-gradient(135deg, #09090b 0%, #111115 100%);
            padding: 20px;
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
            color: #ffffff;
            box-sizing: border-box;
          }
          .invite-card {
            width: 100%;
            max-width: 440px;
            background: rgba(18, 18, 24, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            animation: cardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          .invite-card h2 {
            font-size: 22px;
            font-weight: 700;
            margin: 16px 0 8px 0;
            letter-spacing: -0.5px;
          }

          .invite-card p {
            font-size: 14px;
            color: #a1a1aa;
            line-height: 1.6;
            margin: 0;
          }

          .invite-desc {
            font-size: 15px !important;
            color: #e4e4e7 !important;
            margin-bottom: 24px !important;
          }

          /* Avatar Icons */
          .group-avatar, .group-avatar-active, .success-icon, .error-icon, .info-icon {
            width: 72px;
            height: 72px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin-bottom: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.25);
          }
          .group-avatar {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.2);
          }
          .group-avatar-active {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
          }
          .success-icon {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25);
          }
          .error-icon {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.25);
            animation: shake 0.5s ease-out;
          }
          .info-icon {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.25);
          }

          /* Auth Prompt Box */
          .auth-prompt-box {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 20px;
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 16px;
          }
          .prompt-text {
            font-size: 13px !important;
            color: #71717a !important;
            margin-bottom: 16px !important;
          }
          .auth-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
          }

          /* Group Details Box */
          .group-details-box {
            width: 100%;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 16px 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 28px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13.5px;
          }
          .detail-row .label {
            color: #71717a;
            font-weight: 500;
          }
          .detail-row .value {
            color: #ffffff;
            font-weight: 600;
          }

          /* Buttons */
          .primary-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border: none;
            border-radius: 12px;
            padding: 12px 24px;
            color: #ffffff;
            font-size: 14.5px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
          }
          .primary-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
          }
          .secondary-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px 24px;
            color: #ffffff;
            font-size: 14.5px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s;
          }
          .secondary-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
          }
          .signup-disabled-hint {
            font-size: 12px;
            color: #71717a;
            font-style: italic;
          }
          .text-btn {
            background: none;
            border: none;
            color: #71717a;
            font-size: 13.5px;
            font-weight: 600;
            cursor: pointer;
            transition: color 0.2s;
            padding: 8px;
          }
          .text-btn:hover {
            color: #ef4444;
          }

          /* Action row buttons (Accept / Decline) */
          .action-buttons-row {
            display: flex;
            gap: 12px;
            width: 100%;
          }
          .accept-btn {
            flex: 2;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border: none;
            border-radius: 12px;
            padding: 14px;
            color: #ffffff;
            font-size: 14.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
          }
          .accept-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
          }
          .accept-btn:disabled, .decline-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .decline-btn {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px;
            color: #a1a1aa;
            font-size: 14.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .decline-btn:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
            color: #f87171;
          }

          /* Loading Spinner */
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }

          .relative-card {
            position: relative;
            overflow: hidden;
          }
          .invite-desc-already {
            font-size: 14.5px !important;
            color: #a1a1aa !important;
            margin-bottom: 8px !important;
          }
          .countdown-hint {
            font-size: 13px !important;
            color: #3b82f6 !important;
            font-weight: 600;
            margin-top: 10px;
            margin-bottom: 8px !important;
          }
          .countdown-progress-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            width: 100%;
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
            transform-origin: left;
            animation: countdownProgress 5s linear forwards;
          }

          @keyframes countdownProgress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes cardFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
        `
      }} />
    </Suspense>
  );
}
