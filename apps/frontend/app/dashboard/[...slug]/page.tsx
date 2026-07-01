'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DashboardCatchAllRedirect(): null {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string[] | undefined;

  useEffect(() => {
    if (slug && slug.length > 0) {
      router.replace(`/cloud/${slug.join('/')}`);
    } else {
      router.replace('/cloud/dashboard');
    }
  }, [slug, router]);

  return null;
}
