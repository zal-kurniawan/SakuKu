/**
 * SakuKu - Personal Multi-Wallet Finance Tracker & WhatsApp Bot
 * Pipe-Delimited, Multi-Line Batch & Slash-Command Message Parser Engine
 */

import { formatTransactionTitle } from '@/lib/formatters';

export interface ParsedTransaction {
  kind: 'TRANSACTION';
  action: 'insert';
  title: string;
  walletName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  raw: string;
  lineNumber?: number;
}

export interface ParsedTransfer {
  kind: 'TRANSFER';
  fromWalletName: string;
  toWalletName: string;
  amount: number;
  notes?: string;
  raw: string;
  lineNumber?: number;
}

export interface ParsedCommand {
  kind: 'COMMAND';
  command: 'SALDO' | 'REKAP_TODAY' | 'REKAP_MONTH' | 'HELP';
  raw: string;
  lineNumber?: number;
}

export interface ParsedDelete {
  kind: 'DELETE';
  transactionId: number;
  raw: string;
  lineNumber?: number;
}

export interface ParsedUpdate {
  kind: 'UPDATE';
  transactionId: number;
  title: string;
  walletName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  raw: string;
  lineNumber?: number;
}

export interface ParsedUnknown {
  kind: 'UNKNOWN';
  raw: string;
  reason?: string;
  lineNumber?: number;
}

export type ParseResult =
  | ParsedTransaction
  | ParsedTransfer
  | ParsedCommand
  | ParsedDelete
  | ParsedUpdate
  | ParsedUnknown;

/**
 * Parses numerical amount with suffix abbreviations:
 * 35k / 35rb -> 35,000
 * 2.5jt / 2,5jt / 2.5m -> 2,500,000
 * 100000 / 100.000 / 100,000 -> 100,000
 */
export function parseAmount(input: string): number | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');

  // 2.5jt, 2,5jt, 5jt, 2.5juta, 2m
  const jtMatch = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)(?:jt|juta|m|mio)$/);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    return isNaN(val) ? null : Math.round(val * 1_000_000);
  }

  // 35k, 35rb, 35.5k, 50ribu
  const kMatch = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)(?:k|rb|ribu)$/);
  if (kMatch) {
    const val = parseFloat(kMatch[1].replace(',', '.'));
    return isNaN(val) ? null : Math.round(val * 1_000);
  }

  // Plain number with dot or comma as thousand separator (e.g. 50.000 or 50,000 or 50000)
  let normalized = cleaned;
  if (/^[0-9]{1,3}(?:\.[0-9]{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  } else if (/^[0-9]{1,3}(?:,[0-9]{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(',', '.');
  }

  const numeric = parseFloat(normalized);
  if (isNaN(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

/**
 * Infer category from title if not explicitly provided
 */
export function inferCategory(title: string, type: 'INCOME' | 'EXPENSE'): string {
  const t = title.toLowerCase();

  if (type === 'INCOME') {
    if (t.includes('gaji') || t.includes('salary') || t.includes('payroll')) return 'Gaji';
    if (t.includes('freelance') || t.includes('project') || t.includes('proyek')) return 'Freelance';
    if (t.includes('bonus') || t.includes('thr') || t.includes('insentif')) return 'Bonus/THR';
    if (t.includes('invest') || t.includes('dividen') || t.includes('bunga')) return 'Investasi';
    if (t.includes('jual') || t.includes('cashback') || t.includes('refund')) return 'Penjualan/Refund';
    return 'Pemasukan Lainnya';
  }

  // EXPENSE categories
  if (
    t.includes('makan') ||
    t.includes('minum') ||
    t.includes('kopi') ||
    t.includes('coffee') ||
    t.includes('lunch') ||
    t.includes('dinner') ||
    t.includes('sarapan') ||
    t.includes('resto') ||
    t.includes('snack') ||
    t.includes('cafe') ||
    t.includes('teh') ||
    t.includes('jus') ||
    t.includes('susu') ||
    t.includes('bakso') ||
    t.includes('mie') ||
    t.includes('nasi') ||
    t.includes('ayam')
  ) {
    return 'Makanan & Minuman';
  }
  if (
    t.includes('bensin') ||
    t.includes('gojek') ||
    t.includes('grab') ||
    /\btol\b/i.test(t) ||
    /\btoll\b/i.test(t) ||
    t.includes('parkir') ||
    t.includes('ojol') ||
    t.includes('transport') ||
    t.includes('kereta') ||
    t.includes('mrt')
  ) {
    return 'Transportasi';
  }
  if (
    t.includes('listrik') ||
    t.includes('pln') ||
    t.includes('air') ||
    t.includes('wifi') ||
    t.includes('indihome') ||
    t.includes('pulsa') ||
    t.includes('paket data') ||
    t.includes('internet') ||
    t.includes('sewa') ||
    t.includes('kost')
  ) {
    return 'Tagihan & Utilitas';
  }
  if (
    t.includes('belanja') ||
    t.includes('shopee') ||
    t.includes('tokopedia') ||
    t.includes('supermarket') ||
    t.includes('indomaret') ||
    t.includes('alfamart') ||
    t.includes('baju') ||
    t.includes('beli')
  ) {
    return 'Belanja';
  }
  if (
    t.includes('obat') ||
    t.includes('dokter') ||
    t.includes('apotek') ||
    t.includes('rumah sakit') ||
    t.includes('vitamin') ||
    t.includes('gym')
  ) {
    return 'Kesehatan';
  }
  if (
    t.includes('nonton') ||
    t.includes('bioskop') ||
    t.includes('netflix') ||
    t.includes('spotify') ||
    t.includes('game') ||
    t.includes('steam') ||
    t.includes('hiburan')
  ) {
    return 'Hiburan';
  }
  if (
    t.includes('sedekah') ||
    t.includes('zakat') ||
    t.includes('infaq') ||
    t.includes('donasi')
  ) {
    return 'Donasi & Sosial';
  }

  return 'Lainnya';
}

/**
 * Parses a single line of text
 */
export function parseSingleLine(line: string, lineNumber?: number): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { kind: 'UNKNOWN', raw: line, reason: 'Baris kosong', lineNumber };
  }

  const lower = trimmed.toLowerCase();

  // 1. Slash commands or quick keywords
  if (
    lower === '/saldo' ||
    lower === '/dompet' ||
    lower === 'saldo' ||
    lower === 'dompet'
  ) {
    return { kind: 'COMMAND', command: 'SALDO', raw: trimmed, lineNumber };
  }

  if (
    lower === '/rekap hari ini' ||
    lower === '/rekap today' ||
    lower === 'rekap hari ini' ||
    lower === 'rekap today' ||
    lower === '/rekap'
  ) {
    return { kind: 'COMMAND', command: 'REKAP_TODAY', raw: trimmed, lineNumber };
  }

  if (
    lower === '/rekap bulan ini' ||
    lower === '/rekap month' ||
    lower === 'rekap bulan ini' ||
    lower === 'rekap month'
  ) {
    return { kind: 'COMMAND', command: 'REKAP_MONTH', raw: trimmed, lineNumber };
  }

  if (
    lower === '/help' ||
    lower === '/bantuan' ||
    lower === 'help' ||
    lower === 'bantuan' ||
    lower === '/menu' ||
    lower === 'menu'
  ) {
    return { kind: 'COMMAND', command: 'HELP', raw: trimmed, lineNumber };
  }

  // 2. Pipe-delimited messages
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    const rawAction = parts[0];
    const action = rawAction.toLowerCase();

    const isTransferAction = ['tf', 'transfer', 'pindah', 'kirim'].includes(action);
    const isDeleteAction = ['hapus', 'delete', 'del', 'batal'].includes(action);
    const isUpdateAction = ['update', 'edit', 'ubah'].includes(action);
    const isAddAction = ['add', 'catat', 'insert', '+', 'keluar', 'masuk'].includes(action);

    // If first word before | is not a recognized action
    if (!isTransferAction && !isDeleteAction && !isUpdateAction && !isAddAction) {
      return {
        kind: 'UNKNOWN',
        raw: trimmed,
        reason: `Perintah '${rawAction}' tidak dikenali (gunakan add/catat/tf/update/hapus)`,
        lineNumber,
      };
    }

    // Transfer syntax: tf | WALLET_DARI | WALLET_TUJUAN | AMOUNT | [NOTES]
    if (isTransferAction) {
      if (parts.length < 4 || !parts[1] || !parts[2] || !parts[3]) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: 'Format kolom tidak lengkap (contoh: tf|asal|tujuan|nominal|[catatan])',
          lineNumber,
        };
      }

      const fromWalletName = parts[1];
      const toWalletName = parts[2];
      const rawAmount = parts[3];
      const amount = parseAmount(rawAmount);
      const notes = parts.length > 4 ? parts.slice(4).join(' | ') : undefined;

      if (!amount || amount <= 0) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `Nominal '${rawAmount}' tidak valid`,
          lineNumber,
        };
      }

      if (fromWalletName.toLowerCase() === toWalletName.toLowerCase()) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: 'Dompet asal dan tujuan tidak boleh sama',
          lineNumber,
        };
      }

      return {
        kind: 'TRANSFER',
        fromWalletName,
        toWalletName,
        amount,
        notes,
        raw: trimmed,
        lineNumber,
      };
    }

    // Delete syntax: hapus | ID or delete | ID (e.g., hapus | 105 or delete | #105)
    if (isDeleteAction) {
      if (parts.length < 2 || !parts[1]) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: 'Format kolom tidak lengkap (contoh: hapus|id)',
          lineNumber,
        };
      }

      const rawId = parts[1].replace(/[^0-9]/g, '');
      const txId = parseInt(rawId, 10);
      if (isNaN(txId) || txId <= 0) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `ID transaksi '${parts[1]}' tidak valid`,
          lineNumber,
        };
      }

      return {
        kind: 'DELETE',
        transactionId: txId,
        raw: trimmed,
        lineNumber,
      };
    }

    // Update syntax: update | ID | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]
    if (isUpdateAction) {
      if (parts.length < 6 || !parts[1] || !parts[2] || !parts[3] || !parts[4] || !parts[5]) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: 'Format kolom tidak lengkap (contoh: update|id|judul|dompet|ex|nominal)',
          lineNumber,
        };
      }

      const rawId = parts[1].replace(/[^0-9]/g, '');
      const txId = parseInt(rawId, 10);
      if (isNaN(txId) || txId <= 0) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `ID transaksi '${parts[1]}' tidak valid`,
          lineNumber,
        };
      }

      const title = formatTransactionTitle(parts[2]);
      const walletName = parts[3];
      const rawType = parts[4].toLowerCase();
      const rawAmount = parts[5];
      const amount = parseAmount(rawAmount);

      let type: 'INCOME' | 'EXPENSE';
      if (
        rawType === 'expense' ||
        rawType === 'pengeluaran' ||
        rawType === 'out' ||
        rawType === 'keluar' ||
        rawType === 'exp' ||
        rawType === 'ex' ||
        rawType === '-'
      ) {
        type = 'EXPENSE';
      } else if (
        rawType === 'income' ||
        rawType === 'pemasukan' ||
        rawType === 'in' ||
        rawType === 'masuk' ||
        rawType === 'inc' ||
        rawType === '+'
      ) {
        type = 'INCOME';
      } else {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `Tipe '${parts[4]}' tidak valid (gunakan in/ex)`,
          lineNumber,
        };
      }

      if (!amount || amount <= 0) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `Nominal '${rawAmount}' tidak valid`,
          lineNumber,
        };
      }

      const category =
        parts.length > 6 && parts[6].trim().length > 0
          ? parts[6].trim()
          : inferCategory(title, type);

      return {
        kind: 'UPDATE',
        transactionId: txId,
        title,
        walletName,
        type,
        amount,
        category,
        raw: trimmed,
        lineNumber,
      };
    }

    // Transaction syntax: ACTION | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]
    if (isAddAction) {
      if (parts.length < 5 || !parts[1] || !parts[2] || !parts[3] || !parts[4]) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: 'Format kolom tidak lengkap (contoh: add|judul|dompet|ex|nominal)',
          lineNumber,
        };
      }

      const title = formatTransactionTitle(parts[1]);
      const walletName = parts[2];
      const rawType = parts[3].toLowerCase();
      const rawAmount = parts[4];
      const amount = parseAmount(rawAmount);

      let type: 'INCOME' | 'EXPENSE';
      if (
        rawType === 'expense' ||
        rawType === 'pengeluaran' ||
        rawType === 'out' ||
        rawType === 'keluar' ||
        rawType === 'exp' ||
        rawType === 'ex' ||
        rawType === '-'
      ) {
        type = 'EXPENSE';
      } else if (
        rawType === 'income' ||
        rawType === 'pemasukan' ||
        rawType === 'in' ||
        rawType === 'masuk' ||
        rawType === 'inc' ||
        rawType === '+'
      ) {
        type = 'INCOME';
      } else {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `Tipe '${parts[3]}' tidak valid (gunakan in/ex)`,
          lineNumber,
        };
      }

      if (!amount || amount <= 0) {
        return {
          kind: 'UNKNOWN',
          raw: trimmed,
          reason: `Nominal '${rawAmount}' tidak valid`,
          lineNumber,
        };
      }

      const category =
        parts.length > 5 && parts[5].trim().length > 0
          ? parts[5].trim()
          : inferCategory(title, type);

      return {
        kind: 'TRANSACTION',
        action: 'insert',
        title,
        walletName,
        type,
        amount,
        category,
        raw: trimmed,
        lineNumber,
      };
    }
  }

  // 3. Fallback for non-pipe messages that are not slash commands
  const firstWord = trimmed.split(/[\s|]+/)[0];
  const isRecognized = [
    'add', 'catat', 'insert', '+', 'keluar', 'masuk',
    'tf', 'transfer', 'pindah', 'kirim',
    'update', 'edit', 'ubah',
    'hapus', 'delete', 'del', 'batal'
  ].includes(firstWord.toLowerCase());

  if (isRecognized) {
    return {
      kind: 'UNKNOWN',
      raw: trimmed,
      reason: 'Format kolom tidak lengkap (contoh: add|judul|dompet|ex|nominal)',
      lineNumber,
    };
  }

  return {
    kind: 'UNKNOWN',
    raw: trimmed,
    reason: `Perintah '${firstWord}' tidak dikenali (gunakan add/catat/tf/update/hapus)`,
    lineNumber,
  };
}

/**
 * Splits incoming text by newline `\n`, ignores empty lines,
 * and parses each line into a list of actions (Batch Parser).
 */
export function parseBatchIncomingMessage(content: string): ParseResult[] {
  if (!content) return [];
  const lines = content.split('\n');
  const results: ParseResult[] = [];

  let lineCounter = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      results.push(parseSingleLine(trimmed, lineCounter));
    }
    lineCounter++;
  }

  return results;
}

/**
 * Backwards-compatible single-line parser
 */
export function parseIncomingMessage(content: string): ParseResult {
  const batch = parseBatchIncomingMessage(content);
  if (batch.length === 0) {
    return { kind: 'UNKNOWN', raw: content, reason: 'Pesan kosong' };
  }
  return batch[0];
}
