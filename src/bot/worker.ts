import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { startWhatsAppBot, getBotStatus, restartWhatsAppBot, closeWhatsAppSocket, sendDirectMessage } from './whatsapp';
import { initCronSchedulers } from './cron';
import { prisma } from '../lib/prisma';
import { getDbWorkerCommand, setDbWorkerCommand, setDbBotStatus } from './prisma-auth';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';

console.log('==========================================================');
console.log('🚀 SAKUKU CLOUD WORKER - WHATSAPP BOT & CRON SCHEDULER');
console.log('==========================================================');

const myPhone = process.env.MY_PHONE_NUMBER;
if (!myPhone) {
  console.warn('⚠️ [CONFIG WARNING] MY_PHONE_NUMBER belum diisi di environment variables!');
} else {
  console.log(`🔒 [SECURITY] Whitelist aktif untuk nomor: ${myPhone}`);
}

// 1. Lightweight Native HTTP Server for Cloud Health Checks & UptimeRobot Ping
const server = http.createServer((req, res) => {
  const url = req.url?.split('?')[0];

  if (url === '/health' || url === '/api/health') {
    const status = getBotStatus();
    const payload = JSON.stringify({
      status: 'ok',
      botConnected: status === 'CONNECTED',
      botStatus: status,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(payload);
    return;
  }

  // Root endpoint info
  if (url === '/') {
    const status = getBotStatus();
    const payload = JSON.stringify({
      app: 'SakuKu WhatsApp Bot Worker',
      version: '1.0.0',
      status: 'running',
      botConnected: status === 'CONNECTED',
      uptimeSeconds: Math.floor(process.uptime()),
      healthEndpoint: '/health',
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(payload);
    return;
  }

  // Direct HTTP restart endpoint (authenticated via ADMIN_SECRET_KEY if configured)
  if (url === '/restart' || url === '/api/restart') {
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const reqSecret = req.headers['x-admin-secret'];
    if (adminSecret && reqSecret !== adminSecret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Container process restart triggered' }));

    setTimeout(async () => {
      console.log('🔄 [HTTP RESTART] Menerima instruksi restart via HTTP endpoint...');
      if (commandPollInterval) clearInterval(commandPollInterval);
      await setDbWorkerCommand('IDLE').catch(() => {});
      await setDbBotStatus('RESTARTING', { disconnectReason: null }).catch(() => {});
      try {
        await closeWhatsAppSocket();
      } catch {}
      server.close();
      try {
        await prisma.$disconnect();
      } catch {}
      console.log('💤 Worker keluar (process.exit(1)) untuk full process restart di Render...');
      process.exit(1);
    }, 500);
    return;
  }

  // Internal bridge to send WhatsApp message to owner (authenticated via INTERNAL_API_SECRET)
  if (req.method === 'POST' && (url === '/internal/send-wa' || url === '/api/internal/send-wa')) {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!internalSecret || token !== internalSecret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid INTERNAL_API_SECRET' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const message = parsed.message;
        if (!message || typeof message !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing message parameter' }));
          return;
        }

        const myPhone = process.env.MY_PHONE_NUMBER;
        if (!myPhone) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MY_PHONE_NUMBER not configured' }));
          return;
        }

        const sent = await sendDirectMessage(myPhone, message);
        if (sent) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'WhatsApp message sent' }));
        } else {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'WhatsApp bot is not connected', errorCode: 'WA_DISCONNECTED' }));
        }
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

let isExecutingCommand = false;
let commandPollInterval: NodeJS.Timeout | null = null;

/**
 * Polls the PostgreSQL database every 2.5s for worker commands dispatched from Web Dashboard
 */
function initCommandDispatcher() {
  console.log('📥 [COMMAND LISTENER] Mengaktifkan polling perintah database (setiap 2.5s)...');
  commandPollInterval = setInterval(async () => {
    if (isExecutingCommand) return;
    try {
      const cmd = await getDbWorkerCommand();
      if (cmd?.command === 'RESTART') {
        isExecutingCommand = true;
        console.log('\n⚡ [COMMAND LISTENER] Mendeteksi instruksi RESTART dari Web Dashboard!');
        // Reset command to IDLE immediately in DB to prevent duplicate executions
        await setDbWorkerCommand('IDLE');
        await setDbBotStatus('RESTARTING', { disconnectReason: null });

        console.log('🔄 [WORKER RESTART] Mematikan socket & koneksi untuk full container process restart...');
        if (commandPollInterval) clearInterval(commandPollInterval);
        try {
          await closeWhatsAppSocket();
        } catch (err) {
          console.error('Error saat menutup socket:', err);
        }
        server.close();
        try {
          await prisma.$disconnect();
        } catch {}

        console.log('💤 SakuKu worker keluar (process.exit(1)) agar Render me-restart instance container baru yang 100% fresh!');
        setTimeout(() => {
          process.exit(1);
        }, 800);
        return;
      }
    } catch (err) {
      console.error('⚠️ [COMMAND LISTENER] Error saat polling worker_command:', err);
    } finally {
      isExecutingCommand = false;
    }
  }, 2500);
}

async function startWorker() {
  try {
    // 1. Start HTTP Server first so cloud provider immediately detects port listening
    server.listen(PORT, HOST, () => {
      console.log(`📡 [HEALTH SERVER] HTTP Server berjalan di http://${HOST}:${PORT}`);
      console.log(`🩺 [HEALTH CHECK] Endpoint: http://${HOST}:${PORT}/health`);
    });

    // 2. Initialize Cron Schedulers
    console.log('⏰ [SCHEDULER] Mengaktifkan cron notification jobs...');
    initCronSchedulers();

    // 3. Connect to Baileys WhatsApp Engine
    console.log('🤖 [BOT] Menghubungkan engine Baileys WhatsApp (Zero-File DB Auth)...');
    await startWhatsAppBot();

    // 4. Initialize Database Command Dispatcher Listener (Web -> Worker)
    initCommandDispatcher();

    console.log('\n🟢 SakuKu Cloud Worker berhasil aktif dan melayani koneksi.');
  } catch (error) {
    console.error('❌ Terjadi kesalahan fatal pada SakuKu worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Menerima ${signal}. Mematikan SakuKu Worker secara aman...`);
  if (commandPollInterval) {
    clearInterval(commandPollInterval);
  }
  try {
    await closeWhatsAppSocket();
  } catch (err) {
    console.error('Error saat menutup socket WhatsApp:', err);
  }
  server.close(() => {
    console.log('💤 Health check server dihentikan.');
  });
  try {
    await prisma.$disconnect();
    console.log('🔌 Koneksi database ditutup.');
  } catch (err) {
    console.error('Error saat disconnect database:', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startWorker();
