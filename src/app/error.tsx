'use client';

import React, { useEffect } from 'react';
import { ServerCrash, RefreshCw, Home } from 'lucide-react';
import { SakuKuErrorView } from '@/components/SakuKuErrorView';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Next.js Application Error:', error);
  }, [error]);

  return (
    <SakuKuErrorView
      statusCode={500}
      badge={{
        id: 'HTTP 500 • SYSTEM ERROR',
        en: 'HTTP 500 • SYSTEM ERROR',
      }}
      title={{
        id: 'Terjadi Gangguan Sistem',
        en: 'System Error Occurred',
      }}
      description={{
        id: 'Maaf, terjadi kesalahan tak terduga saat memproses permintaan Anda di SakuKu. Silakan muat ulang atau kembali ke beranda.',
        en: 'Sorry, an unexpected error occurred while processing your request on SakuKu. Please retry or return to the dashboard.',
      }}
      icon={ServerCrash}
      iconAccentColor="rose"
      actions={[
        {
          label: { id: 'Coba Lagi', en: 'Try Again' },
          onClick: () => reset(),
          variant: 'primary',
          icon: RefreshCw,
        },
        {
          label: { id: 'Ke Dashboard', en: 'Go to Dashboard' },
          href: '/',
          variant: 'secondary',
          icon: Home,
        },
      ]}
    />
  );
}
