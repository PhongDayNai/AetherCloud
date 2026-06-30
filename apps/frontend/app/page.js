'use client';

import { useEffect } from 'react';

function getApiOrigin() {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

export default function Home() {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${getApiOrigin()}/api/auth/me`, { credentials: 'include' });
        if (!mounted) return;
        window.location.href = r.ok ? '/dashboard' : '/login';
      } catch {
        if (!mounted) return;
        window.location.href = '/login';
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: '80px auto', padding: 16 }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>PC Photos</h1>
      <p style={{ opacity: 0.9 }}>Đang kiểm tra phiên đăng nhập...</p>
    </main>
  );
}
