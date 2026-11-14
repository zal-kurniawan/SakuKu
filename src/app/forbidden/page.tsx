'use client';

import React from 'react';
import { LockKeyhole, Home, LogIn } from 'lucide-react';
import { SakuKuErrorView } from '@/components/SakuKuErrorView';

export default function ForbiddenPage() {
  return (
    <SakuKuErrorView
      statusCode={403}
      badge={{
        id: 'HTTP 403 • FORBIDDEN',
        en: 'HTTP 403 • FORBIDDEN',
      }}
      title={{
        id: 'Akses Ditolak',
        en: 'Access Forbidden',
      }}
      description={{
        id: 'Anda tidak memiliki izin untuk mengakses halaman atau fitur SakuKu ini karena dibatasi oleh kebijakan keamanan sistem.',
        en: 'You do not have permission to access this SakuKu page or feature due to system security restrictions.',
      }}
      icon={LockKeyhole}
      iconAccentColor="amber"
      actions={[
        {
          label: { id: 'Ke Dashboard', en: 'Go to Dashboard' },
          href: '/',
          variant: 'primary',
          icon: Home,
        },
        {
          label: { id: 'Halaman Login', en: 'Login Page' },
          href: '/login',
          variant: 'secondary',
          icon: LogIn,
        },
      ]}
    />
  );
}
