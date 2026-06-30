'use client';

import { useEffect, useState } from 'react';

function getApiOrigin() {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

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

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Đang đăng nhập...');

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${getApiOrigin()}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });

      clearTimeout(t);

      if (res.ok) {
        setMsg('Đăng nhập thành công, đang chuyển trang...');
        window.location.href = '/dashboard';
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg(`Lỗi: ${data.message || 'Không đăng nhập được'}`);
    } catch (err) {
      if (err?.name === 'AbortError') {
        setMsg('Lỗi: Hết thời gian chờ API đăng nhập (15s).');
      } else {
        setMsg(`Lỗi: ${err?.message || 'Không kết nối được API'}`);
      }
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '70px auto', padding: 16 }}>
      <h2>Đăng nhập PC Photos</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10, borderRadius: 8 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" type="password" style={{ padding: 10, borderRadius: 8 }} />
        <button style={{ padding: 10, borderRadius: 8, background: '#4f7cff', color: '#fff', border: 0 }}>Đăng nhập</button>
      </form>
      <p style={{ marginTop: 12, opacity: 0.9 }}>{msg}</p>
    </main>
  );
}
