import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { startWhatsAppBot, getBotStatus, restartWhatsAppBot } from './whatsapp';
import { initCronSchedulers } from './cron';
import { prisma } from '../lib/prisma';
import { getDbWorkerCommand, setDbWorkerCommand } from './prisma-auth';

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

    if (!isExecutingCommand) {
      isExecutingCommand = true;
      setDbWorkerCommand('IDLE').catch(() => {});
      restartWhatsAppBot().finally(() => {
        isExecutingCommand = false;
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Restart triggered via HTTP' }));
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
        await restartWhatsAppBot();
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
