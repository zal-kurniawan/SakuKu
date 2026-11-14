'use client';

import React from 'react';
import { ShieldAlert, LogIn } from 'lucide-react';
import { SakuKuErrorView } from '@/components/SakuKuErrorView';

export default function UnauthorizedPage() {
  return (
    <SakuKuErrorView
      statusCode={401}
      badge={{
        id: 'HTTP 401 • UNAUTHORIZED',
        en: 'HTTP 401 • UNAUTHORIZED',
      }}
      title={{
        id: 'Akses Tidak Diizinkan',
        en: 'Unauthorized Access',
      }}
      description={{
        id: 'Sesi masuk SakuKu Anda tidak ditemukan, telah kedaluwarsa, atau tidak valid. Silakan masuk kembali untuk melanjutkan.',
        en: 'Your SakuKu session was not found, has expired, or is invalid. Please sign in again to continue.',
      }}
      icon={ShieldAlert}
      iconAccentColor="red"
      actions={[
        {
          label: { id: 'Masuk ke SakuKu', en: 'Sign In to SakuKu' },
          href: '/login',
          variant: 'primary',
          icon: LogIn,
        },
      ]}
    />
  );
}
