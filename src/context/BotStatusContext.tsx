'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type BotConnectionStatus = 'CONNECTED' | 'SCANNING_QR' | 'DISCONNECTED' | 'RESTARTING' | 'LOADING';

export interface BotQRResponse {
  success?: boolean;
  status: 'CONNECTED' | 'SCANNING_QR' | 'DISCONNECTED' | 'RESTARTING';
  connected: boolean;
  qrImage?: string | null;
  rawQr?: string | null;
  phone?: string | null;
  name?: string | null;
  disconnectReason?: 'loggedOut' | 'network' | null;
  hasSession?: boolean;
  updatedAt?: string;
  error?: string;
}

interface BotStatusContextType {
  status: BotConnectionStatus;
  botData: BotQRResponse | null;
  refreshStatus: () => Promise<BotQRResponse | null>;
  setBotStatus: (status: BotConnectionStatus) => void;
  setBotData: (data: BotQRResponse | null) => void;
}

const BotStatusContext = createContext<BotStatusContextType>({
  status: 'LOADING',
  botData: null,
  refreshStatus: async () => null,
  setBotStatus: () => {},
  setBotData: () => {},
});

export const BotStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BotConnectionStatus>('LOADING');
  const [botData, setBotData] = useState<BotQRResponse | null>(null);

  const refreshStatus = useCallback(async (): Promise<BotQRResponse | null> => {
    try {
      const storedSecret =
        typeof window !== 'undefined'
          ? localStorage.getItem('sakuku_admin_secret') || ''
          : '';
      const headers: HeadersInit = {};
      if (storedSecret) {
        headers['x-admin-secret'] = storedSecret;
      }

      const res = await fetch('/api/bot/qr', { headers });
      if (res.status === 401) {
        // If unauthorized, bot is either running or offline, keep disconnected / unauthorized status
        setStatus('DISCONNECTED');
        return null;
      }
      const json: BotQRResponse = await res.json();
      if (json.success) {
        setBotData(json);
        setStatus(json.status);
        return json;
      }
    } catch (err) {
      console.error('Error fetching bot status in context:', err);
      setStatus('DISCONNECTED');
    }
    return null;
  }, []);

  // Initial load & background polling every 25 seconds
  useEffect(() => {
    refreshStatus();

    const interval = setInterval(() => {
      refreshStatus();
    }, 25000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshStatus]);

  return (
    <BotStatusContext.Provider
      value={{
        status,
        botData,
        refreshStatus,
        setBotStatus: setStatus,
        setBotData,
      }}
    >
      {children}
    </BotStatusContext.Provider>
  );
};

export const useBotStatus = () => useContext(BotStatusContext);
