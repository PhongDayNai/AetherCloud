'use client';

import React, { Suspense } from 'react';
import InviteGroupContent from '../../../components/invite/InviteGroupContent';

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
