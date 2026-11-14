# 🚀 Panduan Deployment Cloud 24/7 SakuKu (100% Gratis)

Panduan ini memandu Anda melakukan deployment sistem **SakuKu** ke infrastruktur cloud tier gratis yang handal dengan ketersediaan tinggi (24/7):
- **Database**: PostgreSQL di [Supabase](https://supabase.com) (Gratis 500 MB)
- **Frontend Dashboard**: [Vercel](https://vercel.com) (Gratis Serverless Edge)
- **Bot Worker & Scheduler**: [Render](https://render.com) (Gratis Container)
- **Monitoring & Anti-Sleep**: [UptimeRobot](https://uptimerobot.com) (Gratis 50 monitor / 5 menit ping)
- **Autentikasi & Keamanan**: Passwordless WhatsApp OTP, Smart Offline TOTP Fallback (Google Authenticator / Authy), Smart Session Cookie (`sakuku_session`), and Anti-Replay Guard.

---

## 🏛️ Arsitektur Sistem Cloud

```
+-------------------------------------------------------------------------+
|                              SUPABASE                                   |
|                PostgreSQL Database (Managed Cloud DB)                   |
|  - Data Keuangan: Users, Wallets, Transactions, BudgetLimits            |
|  - Sesi WhatsApp: WhatsAppSession (Kredensial & Signal Keys Baileys)    |
|  - Real-time Status: meta_qr_code & meta_bot_status                     |
|  - Keamanan Auth: AuthOtp & AuthSecurityState (Anti-Replay & Lockout)   |
+-------------------+---------------------------------+-------------------+
                    ^                                 ^
                    | (Prisma ORM)                    | (Prisma ORM)
                    |                                 |
+-------------------+---------------+   +-------------+-------------------+
|               VERCEL              |   |             RENDER              |
|        Frontend Web Dashboard     |   |    Standalone Bot & Scheduler   |
|                                   |   |                                 |
| - Antarmuka Next.js 14 App Router |   | - Baileys WebSocket Bot Engine  |
| - Edge Middleware & Smart Session |   | - Node-Cron Auto Notifikasi     |
| - WhatsApp OTP & Offline TOTP Auth|   | - Zero-File DB Auth Sync        |
| - Custom Error Pages Suite        |   | - HTTP Health Check (Port 8080) |
| - Internal Bridge HTTP Client     |-->| - POST /internal/send-wa        |
+-------------------+---------------+   +-------------+-------------------+
                    ^                                 ^
                    | (HTTPS)                         | (Ping tiap 5 Menit)
                    |                                 |
          +---------+--------+              +---------+--------+
          | Pengguna / Browser |              |  UptimeRobot     |
          |   (Desktop & HP) |              |  (Mencegah Sleep)|
          +------------------+              +------------------+
```

---

## 📋 Prasyarat Sebelum Mulai
1. Akun GitHub: Repositori proyek `SakuKu` sudah di-push ke GitHub Anda.
2. Akun [Supabase](https://supabase.com).
3. Akun [Vercel](https://vercel.com).
4. Akun [Render](https://render.com).
5. Akun [UptimeRobot](https://uptimerobot.com).

---

## 🗄️ Langkah 1: Setup Basis Data Supabase (Gratis)

1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) dan klik **"New Project"**.
2. Masukkan nama project (misal: `sakuku-db`), buat **Database Password** yang kuat (simpan password ini!), dan pilih Region terdekat (contoh: **Singapore [ap-southeast-1]**).
3. Setelah project selesai dibuat, buka menu **Settings** (ikon roda gigi) > **Database**.
4. Gulir ke bawah ke bagian **Connection string**:
   - Pilih tab **URI**.
   - Pilih mode **Transaction** (Port `6543`) dengan pgbouncer.
   - Contoh URI:
     ```text
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
     ```
   - Ganti `[PASSWORD]` dengan database password Anda.
5. **Inisialisasi Skema Database ke Supabase**:
   Buka terminal di komputer lokal pada folder `/Users/rizalkurniawan/Documents/Apps/SakuKu`:
   ```bash
   npx prisma db push
   ```
   > Skema tabel `users`, `wallets`, `transactions`, `budget_limits`, `notification_logs`, `whatsapp_sessions`, `auth_otps`, dan `auth_security_state` akan langsung dibuat dan tersinkronisasi di Supabase!

---

## 🔐 Langkah 2: Setup Kunci Keamanan & TOTP Offline Fallback

Sebelum melakukan deployment, siapkan kunci rahasia berikut:

1. **Buat Kunci Smart Offline TOTP (Google Authenticator / Authy)**:
   Jalankan script CLI bawaan SakuKu di terminal:
   ```bash
   npm run auth:setup-totp
   ```
   - Terminal akan menampilkan QR Code ASCII dan string Base32 Secret (contoh: `JBSWY3DPEHPK3PXP`).
   - Scan QR code atau masukkan kunci ke aplikasi **Google Authenticator** atau **Authy** di ponsel Anda.
   - Simpan string Base32 tersebut untuk diisikan ke variabel `TOTP_SECRET`.

2. **Buat Kunci Acak untuk JWT & Bridge Internal**:
   - `JWT_SECRET`: String acak minimal 32 karakter (contoh: hasil dari `openssl rand -base64 32`).
   - `INTERNAL_API_SECRET`: Kunci rahasia acak untuk autentikasi Next.js -> Worker HTTP bridge.
   - `ADMIN_SECRET_KEY`: Kunci rahasia untuk akses menu darurat web QR.

---

## 🌐 Langkah 3: Deploy Frontend Dashboard ke Vercel (Gratis)

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **"Add New..."** > **"Project"**.
2. Sambungkan akun GitHub Anda dan pilih repositori `SakuKu`.
3. Di halaman konfigurasi deployment Vercel:
   - **Framework Preset**: Next.js (otomatis terdeteksi).
   - **Root Directory**: `./` (default).
   - **Build Command**: `prisma generate && next build`.
4. Buka bagian **Environment Variables** dan tambahkan variabel berikut:
   | Key | Value | Keterangan |
   |---|---|---|
   | `DATABASE_URL` | *`postgresql://...:6543/postgres?...`* | URL koneksi Supabase Anda |
   | `ADMIN_SECRET_KEY` | *`kunci_rahasia_admin`* | Password akses darurat `/admin/qr` |
   | `JWT_SECRET` | *`kunci_jwt_minimal_32_karakter`* | Pengaman session cookie `sakuku_session` |
   | `INTERNAL_API_SECRET`| *`kunci_bridge_rahasia`* | Kunci komunikasi internal Next.js -> Worker |
   | `WORKER_URL` | *`https://sakuku-worker.onrender.com`* | URL publik worker Render Anda |
   | `TOTP_SECRET` | *`JBSWY3DPEHPK3PXP...`* | Kunci Base32 Google Authenticator |
   | `MY_PHONE_NUMBER` | `628563006136` | Nomor WhatsApp Anda (internasional tanpa `+`) |
5. Klik **"Deploy"**. Tunggu ~1 menit hingga Vercel memberikan domain gratis (contoh: `https://sakuku.vercel.app`).

---

## 🤖 Langkah 4: Deploy Worker Bot ke Render (Gratis)

1. Buka [Render Dashboard](https://dashboard.render.com) > **"New +"** > **"Web Service"**.
2. Sambungkan repo GitHub `SakuKu`.
3. Konfigurasi:
   - **Runtime**: Docker (menggunakan `Dockerfile`).
   - **Instance Type**: Free.
   - **Region**: Singapore.
   - **Environment Variables**:
     | Key | Value |
     |---|---|
     | `NODE_ENV` | `production` |
     | `PORT` | `8080` |
     | `DATABASE_URL` | *(URL Supabase port 6543 Anda)* |
     | `MY_PHONE_NUMBER` | `628563006136` |
     | `ADMIN_SECRET_KEY` | *(Sama dengan yang di Vercel)* |
     | `INTERNAL_API_SECRET` | *(Sama dengan yang di Vercel)* |
   - **Health Check Path**: `/health`
4. Klik **"Create Web Service"**.
5. Catat URL publik Render Anda (contoh: `https://sakuku-worker.onrender.com`), lalu pastikan nilai tersebut sudah terisi pada variabel `WORKER_URL` di Vercel!

---

## ⏱️ Langkah 5: Setup UptimeRobot (Mencegah Sleep / Cold-Start)

Tier gratis Render akan masuk mode sleep jika tidak menerima trafik. Gunakan monitoring UptimeRobot gratis untuk mem-ping server setiap 5 menit:

1. Daftar akun di [UptimeRobot.com](https://uptimerobot.com).
2. Klik tombol **"+ Add New Monitor"**.
3. Isi formulir konfigurasi:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `SakuKu Bot Health Check`
   - **URL (or IP)**: `https://<URL-Worker-Render-Anda>/health`
   - **Monitoring Interval**: `Every 5 minutes`
4. Klik **"Create Monitor"**.
5. Selesai! Worker bot WhatsApp Anda akan tetap aktif dan siaga 24 jam penuh!

---

## 📲 Langkah 6: Cara Scan QR dari Web UI Pertama Kali

Tidak perlu membuka terminal server cloud! Anda bisa menghubungkan WhatsApp langsung dari browser:

1. Buka browser dan buka alamat SakuKu Anda di:
   ```text
   https://<domain-vercel-anda>/login
   ```
2. Jika ini login pertama dan bot belum tertaut, Anda dapat mengakses:
   ```text
   https://<domain-vercel-anda>/admin/qr?secret=<ADMIN_SECRET_KEY_ANDA>
   ```
3. Arahkan kamera WhatsApp (Menu > Perangkat Tertaut > Tautkan Perangkat) ke QR code.
4. Dalam 2-4 detik, bot akan terhubung (`CONNECTED`).
5. Mulai sekarang, login ke Web Dashboard SakuKu cukup membuka `/login`, klik **"Kirim Kode OTP ke WhatsApp"**, dan masukkan 6 digit OTP yang diterima di WhatsApp!
6. Jika suatu saat server WhatsApp bot sedang terputus, halaman login otomatis beralih ke **Mode Pemulihan TOTP Offline** (Google Authenticator / Authy) tanpa khawatir terkunci dari sistem!

---

## 🔄 Pemeliharaan & Reset Sesi
Jika suatu saat Anda ingin mengganti nomor WhatsApp atau menyambungkan ulang:
1. Klik tombol **WA Bot** di Navbar dashboard atau buka `/admin/qr`.
2. Klik tombol merah **"Putuskan Tautan"**.
3. Sesi di database Supabase akan dibersihkan dan worker akan memunculkan QR Code baru untuk Anda scan kembali.

---

### 🎉 Selamat! SakuKu Finance Tracker Anda kini aktif 24/7 di Cloud dengan keamanan tingkat tinggi, multi-channel OTP, dan 100% Gratis!
