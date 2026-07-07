'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiOrigin } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import InviteGroupInteractive from './InviteGroupInteractive';

interface InvitationDetails {
  id: string;
  token: string;
  groupId: string;
  groupName: string;
  createdByName: string;
  memberCount: number;
  userStatus: 'none' | 'joined' | 'declined';
}

export default function InviteGroupContent(): React.JSX.Element {
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
  }, [code, apiOrigin, router, language, t]);

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
