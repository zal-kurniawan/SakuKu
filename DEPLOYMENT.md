# 🚀 Panduan Deployment Cloud 24/7 SakuKu (100% Gratis)

Panduan ini memandu Anda melakukan deployment sistem **SakuKu** ke infrastruktur cloud tier gratis yang handal dengan ketersediaan tinggi (24/7):
- **Database**: PostgreSQL di [Supabase](https://supabase.com) (Gratis 500 MB)
- **Frontend Dashboard**: [Vercel](https://vercel.com) (Gratis Serverless Edge)
- **Bot Worker & Scheduler**: [Koyeb](https://www.koyeb.com) atau [Render](https://render.com) (Gratis Container)
- **Monitoring & Anti-Sleep**: [UptimeRobot](https://uptimerobot.com) (Gratis 50 monitor / 5 menit ping)
- **Autentikasi WhatsApp**: Zero-File Database Auth via Prisma (`WhatsAppSession`) + Web QR Scan di `/admin/qr`

---

## 🏛️ Arsitektur Sistem Cloud

```
+-------------------------------------------------------------------------+
|                              SUPABASE                                   |
|                PostgreSQL Database (Managed Cloud DB)                   |
|  - Data Keuangan: Users, Wallets, Transactions, BudgetLimits            |
|  - Sesi WhatsApp: WhatsAppSession (Kredensial & Signal Keys Baileys)    |
|  - Real-time Status: meta_qr_code & meta_bot_status                     |
+-------------------+---------------------------------+-------------------+
                    ^                                 ^
                    | (Prisma ORM)                    | (Prisma ORM)
                    |                                 |
+-------------------+---------------+   +-------------+-------------------+
|               VERCEL              |   |          KOYEB / RENDER         |
|        Frontend Web Dashboard     |   |    Standalone Bot & Scheduler   |
|                                   |   |                                 |
| - Antarmuka Next.js 14 App Router |   | - Baileys WebSocket Bot Engine  |
| - Dark/Light Theme & Multi-Bahasa |   | - Node-Cron Auto Notifikasi     |
| - Excel Bulk Import (/import)     |   | - Zero-File DB Auth Sync        |
| - Web QR Scanner (/admin/qr)      |   | - HTTP Health Check (Port 8080) |
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
4. Akun [Koyeb](https://www.koyeb.com) ATAU [Render](https://render.com).
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
   # Ganti sementara DATABASE_URL di .env dengan URL Supabase Anda
   # Lalu jalankan push skema:
   npx prisma db push
   ```
   > Skema tabel `users`, `wallets`, `transactions`, `budget_limits`, `notification_logs`, dan `whatsapp_sessions` akan langsung dibuat di Supabase!

---

## 🌐 Langkah 2: Deploy Frontend Dashboard ke Vercel (Gratis)

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **"Add New..."** > **"Project"**.
2. Sambungkan akun GitHub Anda dan pilih repositori `SakuKu`.
3. Di halaman konfigurasi deployment Vercel:
   - **Framework Preset**: Next.js (otomatis terdeteksi).
   - **Root Directory**: `./` (default).
   - **Build Command**: `prisma generate && next build` (sudah ada di `package.json`).
4. Buka bagian **Environment Variables** dan tambahkan variabel berikut:
   | Key | Value | Keterangan |
   |---|---|---|
   | `DATABASE_URL` | *`postgresql://...:6543/postgres?...`* | URL koneksi Supabase Anda |
   | `ADMIN_SECRET_KEY` | *`kunci_rahasia_anda_bebas`* | Password akses `/admin/qr` |
   | `MY_PHONE_NUMBER` | `628563006136` | Nomor WhatsApp Anda (internasional tanpa `+`) |
5. Klik **"Deploy"**. Tunggu ~1 menit hingga Vercel memberikan domain gratis (contoh: `https://sakuku.vercel.app`).

---

## 🤖 Langkah 3: Deploy Worker Bot ke Cloud Container (Gratis)

Pilih salah satu dari **Koyeb** (Sangat Direkomendasikan karena response cepat & free tier tanpa kartu kredit) atau **Render**.

### Opsi A: Deploy via Koyeb (Direkomendasikan)
1. Buka [Koyeb Console](https://app.koyeb.com) dan klik **"Create Service"**.
2. Pilih sumber **GitHub**, lalu pilih repositori `SakuKu` Anda.
3. Pada bagian **Build and deployment configuration**:
   - Pilih **Dockerfile**.
   - Dockerfile path: `Dockerfile` (sudah tersedia di root proyek).
4. Pada bagian **Instance**:
   - Pilih **Nano** (Free Tier).
   - Pilih Region: **Singapore (sin)** agar latensi ke pengguna Indonesia sangat rendah.
5. Pada bagian **Environment Variables**, tambahkan:
   - `NODE_ENV` = `production`
   - `PORT` = `8080`
   - `DATABASE_URL` = *(URL connection string Supabase port 6543 Anda)*
   - `MY_PHONE_NUMBER` = `628563006136`
   - `ADMIN_SECRET_KEY` = *(Sama dengan yang di Vercel)*
6. Pada bagian **Health checks**:
   - Tipe: **HTTP**
   - Path: `/health`
   - Port: `8080`
7. Klik **"Deploy"**. Koyeb akan otomatis mem-build Dockerfile dan menjalankan worker. Catat URL aplikasi Koyeb Anda (contoh: `https://sakuku-worker-username.koyeb.app`).

---

### Opsi B: Deploy via Render
1. Buka [Render Dashboard](https://dashboard.render.com) > **"New +"** > **"Web Service"**.
2. Sambungkan repo GitHub `SakuKu`.
3. Konfigurasi:
   - **Runtime**: Docker (menggunakan `Dockerfile`).
   - **Instance Type**: Free.
   - **Region**: Singapore.
   - **Environment Variables**:
     - `DATABASE_URL` = *(URL Supabase Anda)*
     - `MY_PHONE_NUMBER` = `628563006136`
     - `ADMIN_SECRET_KEY` = *(Kunci rahasia Anda)*
     - `PORT` = `8080`
   - **Health Check Path**: `/health`
4. Klik **"Create Web Service"**.

---

## ⏱️ Langkah 4: Setup UptimeRobot (Mencegah Sleep / Cold-Start)

Tier gratis Koyeb / Render akan "tidur" jika tidak menerima trafik. Kita gunakan layanan monitoring UptimeRobot gratis untuk mem-ping server setiap 5 menit:

1. Daftar akun di [UptimeRobot.com](https://uptimerobot.com).
2. Klik tombol **"+ Add New Monitor"**.
3. Isi formulir konfigurasi:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `SakuKu Bot Health Check`
   - **URL (or IP)**: `https://<URL-Koyeb-atau-Render-Anda>/health`
   - **Monitoring Interval**: `Every 5 minutes`
4. Klik **"Create Monitor"**.
5. Selesai! UptimeRobot sekarang memanggil endpoint `/health` secara berkala, memastikan worker bot WhatsApp Anda tetap online dan hidup 24 jam penuh!

---

## 📲 Langkah 5: Cara Scan QR dari Web UI Pertama Kali

Tidak perlu membuka terminal server cloud! Anda bisa scan QR langsung dari layar browser HP atau laptop Anda:

1. Buka browser dan akses halaman rahasia SakuKu Anda di:
   ```text
   https://<domain-vercel-anda>/admin/qr?secret=<ADMIN_SECRET_KEY_ANDA>
   ```
2. Anda akan melihat halaman antarmuka **SakuKu WhatsApp Bot Linker**:
   - Jika worker bot di cloud baru saja aktif, status akan bertuliskan **"Menunggu Scan Perangkat WhatsApp"** dan menampilkan gambar **QR Code**.
   - Halaman ini melakukan refresh data otomatis setiap 3 detik.
3. Buka WhatsApp di ponsel Anda:
   - Masuk ke **Menu Titik Tiga (Android)** atau **Pengaturan (iPhone)**.
   - Pilih **Perangkat Tertaut (Linked Devices)**.
   - Ketuk tombol **Tautkan Perangkat** (Link a Device).
   - Arahkan kamera HP ke QR Code pada halaman web.
4. Dalam 2-4 detik, halaman web akan otomatis berubah menjadi:
   **"✅ WhatsApp Bot Berhasil Terhubung!"** lengkap dengan nomor telepon Anda yang terdeteksi.
5. Bot siap digunakan! Buka obrolan WhatsApp dan coba ketik:
   ```text
   /menu
   ```
   atau
   ```text
   insert | makan siang | bca | expense | 35k
   ```
   Bot akan langsung merespons dan data akan otomatis tampil di Dashboard Web Anda!

---

## 🔄 Pemeliharaan & Reset Sesi
Jika suatu saat Anda ingin mengganti nomor WhatsApp atau menyambungkan ulang:
1. Buka kembali halaman `https://<domain-vercel-anda>/admin/qr`.
2. Klik tombol merah **"Putuskan Tautan"**.
3. Sesi di database Supabase akan dibersihkan dan worker akan memunculkan QR Code baru untuk Anda scan kembali.

---

### 🎉 Selamat! SakuKu Finance Tracker Anda kini aktif 24/7 di Cloud secara 100% Gratis!
