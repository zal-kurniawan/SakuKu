/**
 * Internal WhatsApp Notification Client
 * Dispatches messages to SakuKu Worker via POST /internal/send-wa
 */

export interface SendWhatsAppResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export async function sendWhatsAppNotification(message: string): Promise<SendWhatsAppResult> {
  const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    console.warn('⚠️ [WA NOTIFY] INTERNAL_API_SECRET belum diatur di environment variable');
    return {
      success: false,
      error: 'INTERNAL_API_SECRET is not configured',
      errorCode: 'NO_INTERNAL_SECRET',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${workerUrl.replace(/\/$/, '')}/internal/send-wa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalSecret}`,
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      error: data.error || `HTTP ${res.status}`,
      errorCode: data.errorCode || 'SEND_FAILED',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('⚠️ [WA NOTIFY] Request timeout (5s) saat menghubungi worker internal');
      return {
        success: false,
        error: 'Timeout connecting to WhatsApp worker',
        errorCode: 'TIMEOUT',
      };
    }
    console.warn('⚠️ [WA NOTIFY] Gagal menghubungi worker internal:', err.message);
    return {
      success: false,
      error: err.message,
      errorCode: 'NETWORK_ERROR',
    };
  }
}
