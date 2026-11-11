# 💰 SakuKu - Personal Multi-Wallet Finance Tracker & WhatsApp Bot

Aplikasi manajemen keuangan pribadi multi-dompet (*Personal Multi-Wallet Finance Tracker*) terpadu dengan **WhatsApp Bot berbasis Baileys**, **Scheduler Notifikasi Otomatis (Cron)**, **Pemrosesan Multi-Transaksi Sekaligus (Batch Parser)**, serta **Web Dashboard Modern** berbasis Next.js App Router, Tailwind CSS, Recharts, dan Prisma ORM.

---

## 🏛️ Arsitektur Sistem

```
                               ┌────────────────────────────────────────┐
                               │             USER INTERFACE             │
                               ├───────────────────┬────────────────────┤
                               │    WHATSAPP APP   │   WEB DASHBOARD    │
                               │  (Mobile / Web)   │ (Next.js 14 App)   │
                               └─────────┬─────────┴─────────┬──────────┘
                                         │                   │
                                   WhatsApp WS          HTTP REST API
                                         │                   │
  ┌──────────────────────────────────────┼───────────────────┼──────────────────────────────────────┐
  │ BACKEND ENGINE                       ▼                   ▼                                      │
  │                     ┌─────────────────────────┐ ┌─────────────────────────┐                     │
  │                     │ SakuKu WA Socket        │ │ Next.js API Handlers    │                     │
  │                     │ (@whiskeysockets/baileys│ │ (/api/wallets, /stats)  │                     │
  │                     └────────────┬────────────┘ └────────────┬────────────┘                     │
  │                                  │                           │                                  │
  │                                  ▼                           │                                  │
  │                     ┌─────────────────────────┐              │                                  │
  │                     │ Multi-Line Batch Parser │              │                                  │
  │                     │ (Atomic Batch Engine)   │              │                                  │
  │                     └────────────┬────────────┘              │                                  │
  │                                  │                           │                                  │
  │                                  ▼                           ▼                                  │
  │                     ┌─────────────────────────────────────────────┐                             │
  │                     │              Prisma ORM Client              │                             │
  │                     └──────────────────────┬──────────────────────┘                             │
  │                                            │                                                    │
  │ ┌───────────────────────┐                  │                                                    │
  │ │ Node-Cron Scheduler   │                  ▼                                                    │
  │ │ - 20:00 Daily Check   ├─────►  ┌───────────────────┐                                          │
  │ │ - 21:00 Month/Year    │        │ PostgreSQL /      │                                          │
  │ └───────────────────────┘        │ Supabase Database │                                          │
  │                                  └───────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Direktori Resmi

```
/Users/rizalkurniawan/Documents/Apps/SakuKu
├── auth_session/             # Direktori penyimpanan token sesi Baileys (auto-generated)
├── prisma/
│   ├── schema.prisma         # Skema relasional PostgreSQL & Supabase
│   └── schema.sqlite.prisma  # Skema SQLite alternatif untuk pengujian lokal instan
├── prisma.config.ts          # Konfigurasi koneksi Prisma 7
├── src/
│   ├── app/                  # Next.js 14 App Router
│   │   ├── api/              # API Routes (wallets, transactions, transfer, budgets, stats, export, import)
│   │   │   ├── import/
│   │   │   │   ├── commit/route.ts   # Commit batch chunked transactions
│   │   │   │   └── preview/route.ts  # Parse & validate Excel preview
│   │   ├── globals.css       # Tailwind CSS & custom design tokens
│   │   ├── import/
│   │   │   └── page.tsx      # Excel Bulk Import UI with drag-and-drop & preview
│   │   ├── layout.tsx        # Root Layout (Theme & i18n Provider)
│   │   └── page.tsx          # Single-Page Responsive Finance Dashboard
│   ├── bot/                  # Backend WhatsApp Bot & Automasi
│   │   ├── cron.ts           # Scheduler node-cron (Daily, Monthly, Yearly)
│   │   ├── handler.ts        # Database processor & atomic batch mutator
│   │   ├── index.ts          # Bot runner entrypoint
│   │   ├── parser.test.ts    # Unit tests untuk batch parser & amount parsing
│   │   ├── parser.ts         # Multi-line batch parser & amount abbreviations
│   │   └── whatsapp.ts       # Baileys socket, terminal QR & profile updater
│   ├── components/           # Komponen UI Modern
│   ├── context/
│   │   └── LanguageContext.tsx  # Dynamic i18n Context (id <-> en)
│   ├── lib/
│   │   ├── current-user.ts   # User resolver
│   │   ├── excel-parser.ts   # Excel cleaning & pairing engine
│   │   ├── excel-parser.test.ts # Unit tests for Excel dataset
│   │   ├── prisma.ts         # Singleton Prisma Client & PG Pool adapter
│   │   └── utils.ts          # Currency formatter & class merger
│   └── locales/
│       ├── en.json           # Kamus terjemahan Bahasa Inggris
│       └── id.json           # Kamus terjemahan Bahasa Indonesia
├── .env                      # Environment configuration aktif
├── .env.example              # Template variabel lingkungan
├── package.json              # Dependensi & NPM scripts
├── tailwind.config.js        # Konfigurasi tema Tailwind CSS
└── tsconfig.json             # Konfigurasi TypeScript
```

---

## ⚡ Fitur Utama SakuKu

### 1. WhatsApp Bot Engine (Baileys Multi-Device)
- **Terminal QR Code**: Langsung scan via menu *Perangkat Tertaut* pada WhatsApp.
- **Sesi Persisten**: Token auth tersimpan di `./auth_session` sehingga tidak perlu scan ulang saat restart.
- **Whitelist Nomor**: Hanya memproses pesan dari nomor pemilik yang ada di `MY_PHONE_NUMBER`. Grup chat dan nomor lain otomatis diabaikan.
- **Auto Profile Name**: Otomatis memperbarui nama profil akun bot menjadi `SakuKu` saat sesi terhubung.

### 2. Multi-Transaksi Sekaligus (Multi-Line Batch Parsing)
Kirim beberapa baris transaksi sekaligus dalam 1 kali kirim chat via WhatsApp (dipisahkan baris baru `\n`):

```text
insert | makan siang | bca | expense | 35k
insert | beli kopi | gopay | expense | 18k
tf | bca | gopay | 50k | top up
```

Bot SakuKu akan mengeksekusi semua transaksi di atas secara **atomik** (`prisma.$transaction`) dan membalas dengan ringkasan terpadu:
```text
🤖 [SakuKu Assistant]
✅ Berhasil memproses 3 transaksi sekaligus!

1. 🔴 [PENGELUARAN] makan siang
   Dompet: BCA (-Rp 35.000)
   Kategori: Makanan & Minuman

2. 🔴 [PENGELUARAN] beli kopi
   Dompet: GoPay (-Rp 18.000)
   Kategori: Makanan & Minuman

3. 🔄 [TRANSFER] BCA ➡️ GoPay
   Nominal: Rp 50.000 (top up)

───────────────────────
💼 Status Saldo Dompet Terkait:
• BCA: Rp 4.415.000
• GoPay: Rp 152.000

✨ SakuKu Financial Assistant
```

### 3. Syntax Perintah Cepat (Slash Commands)
- `/saldo` atau `/dompet` : Rincian saldo tiap instrumen dompet & Total Net Worth.
- `/rekap hari ini` : Ringkasan cashflow dan riwayat transaksi hari ini.
- `/rekap bulan ini` : Evaluasi bulanan, savings rate %, dan Top 3 kategori belanja.
- `/help` : Panduan lengkap format template transaksi.

### 4. Excel Bulk Import Engine (`/import`)
- **Drag-and-Drop Uploader**: Menerima file `.xlsx`, `.xls`, dan `.csv`.
- **Smart Sheet Selector**: Otomatis mendeteksi lembar `Detail Pengeluaran`.
- **Auto-Cleansing**:
  - Mengabaikan baris kosong, header tanggal, baris subtotal, dan rekapitulasi bulanan.
  - Memetakan `Initial Income` menjadi saldo awal dompet dan transaksi saldo awal.
  - Normalisasi nama bank/dompet (`Bni`/`BNI` -> BNI, `Jago`/`Jagl` typo -> Jago, `Bca` -> BCA, `Cash` -> Cash).
- **Logika Khusus Pasangan Transfer**:
  - Pasangan `Transfer Out` dan `Transfer In` pada tanggal dan nominal sama otomatis digabung menjadi **1 transaksi TRANSFER** tunggal.
  - `Transfer Out` yatim (tanpa pasangan) dipetakan sebagai **EXPENSE** (Transfer Keluar / Pihak Ketiga).
  - `Transfer In` yatim dipetakan sebagai **INCOME** (Transfer Masuk / Titipan).
- **Batch Insertion Teroptimasi**:
  - Memasukkan ribuan baris transaksi secara bertahap (chunking per 250 transaksi) menggunakan `prisma.$transaction`.

### 5. Cron Scheduler & Notifikasi
- **Daily Reminder (20:00 WIB)**: Mengecek apakah pengguna sudah mencatat pengeluaran hari ini. Kirim pesan pengingat ramah jika belum ada data.
- **Monthly Report (Hari terakhir setiap bulan, 21:00 WIB)**: Rekap total pemasukan, pengeluaran, saldo akhir tiap dompet, savings rate (%), dan top 3 kategori pengeluaran terbesar.
- **Yearly Report (31 Desember, 21:00 WIB)**: Evaluasi tahunan arus kas total, perbandingan antar bank/dompet, dan performa tabungan selama 1 tahun.
- *Semua eksekusi dicatat di tabel `NotificationLog` untuk mencegah duplikasi pesan.*

### 5. Web Dashboard Modern
- **Internationalization (i18n)**: Toggle instan antara **Bahasa Indonesia (`id`)** dan **English (`en`)**.
- **Dark / Light Mode**: Menggunakan `next-themes` dengan styling konsisten.
- **Multi-Wallet CRUD**: Kelola rekening Bank, E-Wallet, dan Cash lengkap dengan warna kartu.
- **Modal Transfer**: Pindah saldo antar rekening langsung dari browser secara atomik.
- **Visualisasi Recharts**:
  - Bar Chart Arus Kas Bulanan (Pemasukan vs Pengeluaran).
  - Donut Chart Komposisi Portofolio Aset.
- **Budget Limit**: Peringatan visual warna (Kuning >75%, Merah >100%).
- **Export Data**: Tombol download riwayat transaksi ke format **CSV**.

---

## 🚀 Panduan Menjalankan di `/Users/rizalkurniawan/Documents/Apps/SakuKu`

### Langkah 1: Masuk ke Direktori
```bash
cd /Users/rizalkurniawan/Documents/Apps/SakuKu
```

### Langkah 2: Konfigurasi `.env`
Buka file `.env` dan masukkan nomor WhatsApp Anda:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_tracker?schema=public"
MY_PHONE_NUMBER="6281234567890"
DEFAULT_USER_NAME="Rizal Kurniawan"
TIMEZONE="Asia/Jakarta"
```

### Langkah 3: Sinkronisasi Database
```bash
npx prisma db push
```

### Langkah 4: Uji Coba Parser Batch
Jalankan unit test parser multi-line:
```bash
npm run test:parser
```

### Langkah 5: Menjalankan WhatsApp Bot & Scan QR
```bash
npm run bot
```
- Buka **WhatsApp** di HP > **Perangkat Tertaut (Linked Devices)** > **Tautkan Perangkat** > Scan QR code di terminal.

### Langkah 6: Menjalankan Web Dashboard
```bash
npm run dev
```
Buka browser di: **[http://localhost:3000](http://localhost:3000)**

### Menjalankan Keduanya Sekaligus:
```bash
npm run dev:all
```
