'use client';

import React from 'react';
import { Compass, Home } from 'lucide-react';
import { SakuKuErrorView } from '@/components/SakuKuErrorView';

export default function NotFound() {
  return (
    <SakuKuErrorView
      statusCode={404}
      badge={{
        id: 'HTTP 404 • NOT FOUND',
        en: 'HTTP 404 • NOT FOUND',
      }}
      title={{
        id: 'Halaman Tidak Ditemukan',
        en: 'Page Not Found',
      }}
      description={{
        id: 'Halaman SakuKu yang Anda tuju tidak tersedia, telah dipindahkan, atau tautan yang dibuka salah.',
        en: 'The SakuKu page you are looking for does not exist, has been moved, or the link is incorrect.',
      }}
      icon={Compass}
      iconAccentColor="blue"
      actions={[
        {
          label: { id: 'Kembali ke Dashboard', en: 'Back to Dashboard' },
          href: '/',
          variant: 'primary',
          icon: Home,
        },
      ]}
    />
  );
}
