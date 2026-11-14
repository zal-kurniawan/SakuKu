'use client';

import React, { useEffect } from 'react';
import { ServerCrash, RefreshCw, Home } from 'lucide-react';
import { SakuKuErrorView } from '@/components/SakuKuErrorView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal Global Application Error:', error);
  }, [error]);

  return (
    <html lang="id" className="dark">
      <body className="bg-gray-50 dark:bg-[#070b14] text-gray-900 dark:text-gray-100 antialiased">
        <SakuKuErrorView
          statusCode={500}
          badge={{
            id: 'HTTP 500 • GLOBAL SYSTEM ERROR',
            en: 'HTTP 500 • GLOBAL SYSTEM ERROR',
          }}
          title={{
            id: 'Terjadi Gangguan Sistem Fatal',
            en: 'Fatal System Error Occurred',
          }}
          description={{
            id: 'Terjadi kegagalan kritis pada antarmuka sistem SakuKu. Silakan coba muat ulang atau buka kembali halaman utama.',
            en: 'A critical system error occurred in the SakuKu interface. Please try reloading or return to the main dashboard.',
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
      </body>
    </html>
  );
}
