'use client';

import React, { useEffect, useState } from 'react';

function getApiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

// Bộ icon SVG đồng bộ phong cách tối giản (Outline Theme, strokeWidth=2)
const Icons = {
  User: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Lock: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Key: (): React.JSX.Element => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
};

export default function LoginPage(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${getApiOrigin()}/api/auth/me`, { credentials: 'include' });
        if (!mounted) return;
        if (r.ok) window.location.href = '/dashboard';
      } catch { }
    })();

    return () => { mounted = false; };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setIsLoading(true);

    const payload = isLogin 
      ? { email, password } 
      : { email, password, name, invite_code: inviteCode };

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${getApiOrigin()}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      clearTimeout(t);
      setIsLoading(false);

      if (res.ok) {
        setMsg(isLogin ? 'Đăng nhập thành công, đang chuyển hướng...' : 'Đăng ký thành công! Đang tự động đăng nhập...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg(`Lỗi: ${data.message || (isLogin ? 'Không đăng nhập được' : 'Không đăng ký được')}`);
    } catch (err: any) {
      setIsLoading(false);
      if (err?.name === 'AbortError') {
        setMsg('Lỗi: Hết thời gian chờ kết nối API (15 giây).');
      } else {
        setMsg(`Lỗi: ${err?.message || 'Không kết nối được API server'}`);
      }
    }
  }

  return (
    <div className="container">
      {/* Dynamic Background Glows */}
      <div className="glow glow-1" />
      <div className="glow glow-2" />
      <div className="glow glow-3" />

      <main className="card">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.36 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C8.08 7.14 9.94 6 12 6C14.89 6 17.31 8.05 17.82 10.9L18.09 12.4L19.61 12.51C20.96 12.61 22 13.72 22 15C22 16.65 20.65 18 19 18Z" fill="url(#logo-grad)"/>
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="4" x2="24" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60a5fa" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">AETHERCLOUD</h1>
        </div>

        <h2 className="title">
          {isLogin ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}
        </h2>
        <p className="subtitle">
          {isLogin ? 'Chào mừng bạn quay lại với không gian lưu trữ riêng tư' : 'Nhận không gian lưu trữ và cộng tác an toàn'}
        </p>

        <form onSubmit={onSubmit} className="form">
          {!isLogin && (
            <div className="input-group">
              <label className="label">Tên hiển thị</label>
              <div className="input-wrapper">
                <span className="input-icon"><Icons.User /></span>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ví dụ: Nguyễn Văn A" 
                  required
                  className="input"
                />
              </div>
            </div>
          )}
          
          <div className="input-group">
            <label className="label">Tài khoản / Email</label>
            <div className="input-wrapper">
              <span className="input-icon"><Icons.Mail /></span>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Nhập email hoặc tên tài khoản" 
                type="text"
                required
                className="input"
              />
            </div>
          </div>
          
          <div className="input-group">
            <label className="label">Mật khẩu</label>
            <div className="input-wrapper">
              <span className="input-icon"><Icons.Lock /></span>
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                type="password" 
                required
                className="input"
              />
            </div>
          </div>
          
          {!isLogin && (
            <div className="input-group">
              <label className="label">Mã mời đăng ký</label>
              <div className="input-wrapper">
                <span className="input-icon"><Icons.Key /></span>
                <input 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value)} 
                  placeholder="Mã 6 ký tự (Ví dụ: AB12CD)" 
                  maxLength={6}
                  required
                  className="input invite-input"
                />
              </div>
            </div>
          )}

          <button 
            disabled={isLoading}
            className="submit-btn"
          >
            {isLoading ? (
              <span className="spinner-container">
                <span className="spinner" /> Đang xử lý...
              </span>
            ) : (isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản')}
          </button>
        </form>

        <div className="toggle-container">
          {isLogin ? (
            <p>
              Chưa có tài khoản?{' '}
              <span 
                onClick={() => { setIsLogin(false); setMsg(''); }} 
                className="toggle-link"
              >
                Đăng ký ngay
              </span>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <span 
                onClick={() => { setIsLogin(true); setMsg(''); }} 
                className="toggle-link"
              >
                Đăng nhập
              </span>
            </p>
          )}
        </div>

        {msg && (
          <div className={`message ${msg.startsWith('Lỗi') ? 'error-msg' : 'success-msg'}`}>
            {msg}
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #09090b;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
          padding: 24px;
          box-sizing: border-box;
        }

        /* Decorative Glow Circles */
        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 1;
        }
        .glow-1 {
          width: 350px;
          height: 350px;
          background: #4f7cff;
          top: 10%;
          left: 15%;
        }
        .glow-2 {
          width: 450px;
          height: 450px;
          background: #2563eb;
          bottom: 10%;
          right: 15%;
        }
        .glow-3 {
          width: 300px;
          height: 300px;
          background: #3b82f6;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.06;
        }

        /* Card container with Glassmorphism */
        .card {
          width: 100%;
          max-width: 420px;
          background: rgba(18, 18, 22, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7);
          z-index: 10;
          color: #f4f4f5;
          box-sizing: border-box;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .logo-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.3));
          animation: float 4s ease-in-out infinite;
        }
        .logo-text {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 5px;
          color: #71717a;
          margin: 0;
        }

        .title {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          margin: 0 0 8px 0;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 13.5px;
          color: #71717a;
          text-align: center;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .label {
          font-size: 12.5px;
          font-weight: 600;
          color: #a1a1aa;
          letter-spacing: 0.3px;
        }

        /* Icon wrapper inside input */
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #71717a;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .input {
          background: rgba(9, 9, 11, 0.8);
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 12px 14px 12px 42px; /* Dành khoảng trống 42px bên trái cho icon */
          color: #f4f4f5;
          font-size: 14.5px;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        .input::placeholder {
          color: #52525b;
        }
        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          background: #09090b;
        }
        .input:focus + .input-icon {
          color: #3b82f6; /* Đổi màu icon đồng bộ khi focus input */
        }

        .invite-input {
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .submit-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 10px;
          padding: 14px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          filter: brightness(1.05);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          background: #27272a;
          color: #52525b;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        .toggle-container {
          margin-top: 24px;
          text-align: center;
          font-size: 13.5px;
          color: #71717a;
        }
        .toggle-link {
          color: #3b82f6;
          cursor: pointer;
          font-weight: 700;
          transition: color 0.2s ease;
        }
        .toggle-link:hover {
          color: #60a5fa;
          text-decoration: underline;
        }

        .message {
          margin-top: 24px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13.5px;
          text-align: center;
          animation: slideIn 0.3s ease-out;
          line-height: 1.5;
        }
        .error-msg {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }
        .success-msg {
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #a7f3d0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
