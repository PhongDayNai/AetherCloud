'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cloud/dashboard');
  }, [router]);

  return null;
}
