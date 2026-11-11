import * as XLSX from 'xlsx';

export interface RawExcelRow {
  Date?: any;
  Description?: any;
  'Payment Method'?: any;
  Type?: any;
  Income?: any;
  Expenses?: any;
  Transfer?: any;
  [key: string]: any;
}

export interface InitialBalanceItem {
  walletName: string;
  balance: number;
}

export interface CleanedTransactionItem {
  date: Date;
  dateStr: string;
  title: string;
  walletName: string;
  destinationWalletName?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  category: string;
  notes?: string;
  isInitial?: boolean;
}

export interface DetectedWallet {
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH';
  colorCode: string;
  initialBalance: number;
}

export interface ExcelParseResult {
  initialBalances: InitialBalanceItem[];
  transactions: CleanedTransactionItem[];
  detectedWallets: DetectedWallet[];
  summary: {
    totalRows: number;
    validTransactions: number;
    incomeCount: number;
    incomeTotal: number;
    expenseCount: number;
    expenseTotal: number;
    transferCount: number;
    transferTotal: number;
  };
}

/**
 * Normalizes payment method / wallet names and auto-detects wallet type & color
 */
export function normalizeWallet(raw: string): {
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH';
  colorCode: string;
} {
  const cleaned = (raw || '').trim();
  const lower = cleaned.toLowerCase();

  if (lower === 'bni') {
    return { name: 'BNI', type: 'BANK', colorCode: '#F97316' };
  }
  if (lower === 'bca') {
    return { name: 'BCA', type: 'BANK', colorCode: '#00529C' };
  }
  if (lower === 'jago' || lower === 'jagl') {
    return { name: 'Jago', type: 'BANK', colorCode: '#8B5CF6' };
  }
  if (lower === 'mandiri') {
    return { name: 'Mandiri', type: 'BANK', colorCode: '#0A3B72' };
  }
  if (lower === 'bri') {
    return { name: 'BRI', type: 'BANK', colorCode: '#00529C' };
  }
  if (lower === 'superbank') {
    return { name: 'Superbank', type: 'BANK', colorCode: '#EC4899' };
  }
  if (lower === 'cash' || lower === 'tunai' || lower === 'dompet') {
    return { name: 'Cash', type: 'CASH', colorCode: '#10B981' };
  }
  if (lower === 'gopay') {
    return { name: 'GoPay', type: 'EWALLET', colorCode: '#00AED6' };
  }
  if (lower === 'dana') {
    return { name: 'DANA', type: 'EWALLET', colorCode: '#118EEA' };
  }
  if (lower === 'ovo') {
    return { name: 'OVO', type: 'EWALLET', colorCode: '#4C1D95' };
  }
  if (lower === 'shopee' || lower === 'shopeepay') {
    return { name: 'ShopeePay', type: 'EWALLET', colorCode: '#EE4D2D' };
  }

  // Fallback heuristic
  const isEwallet = /gopay|ovo|dana|shopee|linkaja/i.test(cleaned);
  const isCash = /cash|tunai/i.test(cleaned);
  const type = isEwallet ? 'EWALLET' : isCash ? 'CASH' : 'BANK';
  const colorCode = isEwallet ? '#00AED6' : isCash ? '#10B981' : '#2563EB';

  return { name: cleaned.toUpperCase(), type, colorCode };
}

/**
 * Clean & Parse number from string or number
 */
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const str = String(val).trim().replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Parse Excel date to standard Date object and YYYY-MM-DD string
 */
function parseExcelDate(val: any): { date: Date; dateStr: string } | null {
  if (!val) return null;

  // 1. If already a JS Date
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return { date: val, dateStr: `${y}-${m}-${d}` };
  }

  // 2. If Excel numeric serial date (e.g. 45698 or '45698.29181')
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const jsDate = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      const y = jsDate.getFullYear();
      const m = String(jsDate.getMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getDate()).padStart(2, '0');
      return { date: jsDate, dateStr: `${y}-${m}-${d}` };
    }
  }

  const str = String(val).trim();
  if (str.toLowerCase().includes('initial') || str.toLowerCase().includes('total')) {
    return null;
  }

  // Check if string is a numeric serial date (e.g. "45698.29181")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 20000 && num < 90000) {
      const jsDate = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getFullYear();
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getDate()).padStart(2, '0');
        return { date: jsDate, dateStr: `${y}-${m}-${d}` };
      }
    }
  }

  // 3. Try YYYY-MM-DD or YYYY/MM/DD
  const matchIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    const y = parseInt(matchIso[1], 10);
    const m = parseInt(matchIso[2], 10);
    const d = parseInt(matchIso[3], 10);
    const dt = new Date(y, m - 1, d);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { date: dt, dateStr };
  }

  // 4. Try DD/MM/YYYY or D/M/YYYY
  const matchDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDmy) {
    const d = parseInt(matchDmy[1], 10);
    const m = parseInt(matchDmy[2], 10);
    const y = parseInt(matchDmy[3], 10);
    const dt = new Date(y, m - 1, d);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { date: dt, dateStr };
  }

  // 5. Try parsing directly
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return { date: dt, dateStr: `${y}-${m}-${d}` };
  }

  return null;
}

/**
 * Intelligent categorization based on title and type
 */
function detectCategory(title: string, type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): string {
  const t = title.toLowerCase();

  if (type === 'TRANSFER') {
    return 'Transfer Antar Dompet';
  }

  // Special Reimbursement / Talangan
  if (t.includes('reimburse') || t.includes('reimbursement') || t.includes('talangan')) {
    return 'Reimbursement / Talangan';
  }

  // Hutang / Piutang
  if (t.includes('hutang') || t.includes('piutang') || t.includes('pinjam')) {
    return 'Hutang & Pinjaman';
  }

  if (type === 'INCOME') {
    if (t.includes('gaji') || t.includes('payroll') || t.includes('thr') || t.includes('bonus')) {
      return 'Gaji & Pendapatan';
    }
    if (t.includes('sbn') || t.includes('dividen') || t.includes('bunga') || t.includes('jual emas') || t.includes('rdn')) {
      return 'Investasi & Bunga';
    }
    if (t.includes('cashback') || t.includes('refund')) {
      return 'Cashback & Refund';
    }
    return 'Pemasukan Lainnya';
  }

  // EXPENSE categories
  if (
    t.includes('makan') ||
    t.includes('minum') ||
    t.includes('kopi') ||
    t.includes('coffee') ||
    t.includes('cafe') ||
    t.includes('resto') ||
    t.includes('shihlin') ||
    t.includes('chatime') ||
    t.includes('solaria') ||
    t.includes('bakso') ||
    t.includes('kebab') ||
    t.includes('warteg') ||
    t.includes('gofood') ||
    t.includes('shopeefood') ||
    t.includes('grabfood') ||
    t.includes('roti') ||
    t.includes('martabak') ||
    t.includes('ice cream') ||
    t.includes('es krim') ||
    t.includes('snack') ||
    t.includes('jus')
  ) {
    return 'Makanan & Minuman';
  }

  if (
    t.includes('gojek') ||
    t.includes('gocar') ||
    t.includes('grab') ||
    t.includes('grabbike') ||
    t.includes('grabcar') ||
    t.includes('bus') ||
    t.includes('bis') ||
    t.includes('kereta') ||
    t.includes('mrt') ||
    t.includes('tiket') ||
    t.includes('bensin') ||
    t.includes('parkir') ||
    t.includes('tol') ||
    t.includes('jaklingko') ||
    t.includes('tapcash') ||
    t.includes('emoney')
  ) {
    return 'Transportasi';
  }

  if (
    t.includes('kos') ||
    t.includes('kost') ||
    t.includes('listrik') ||
    t.includes('pln') ||
    t.includes('wifi') ||
    t.includes('internet') ||
    t.includes('pulsa') ||
    t.includes('paket') ||
    t.includes('im3') ||
    t.includes('air mineral')
  ) {
    return 'Tagihan & Utilitas';
  }

  if (
    t.includes('reksadana') ||
    t.includes('emas') ||
    t.includes('saham') ||
    t.includes('stockbit') ||
    t.includes('bibit') ||
    t.includes('invest')
  ) {
    return 'Investasi & Tabungan';
  }

  if (
    t.includes('superindo') ||
    t.includes('indomaret') ||
    t.includes('alfamart') ||
    t.includes('shopee') ||
    t.includes('tokopedia') ||
    t.includes('uniqlo') ||
    t.includes('baju') ||
    t.includes('celana') ||
    t.includes('sandal') ||
    t.includes('sepatu') ||
    t.includes('beli')
  ) {
    return 'Belanja & Kebutuhan';
  }

  if (
    t.includes('obat') ||
    t.includes('dokter') ||
    t.includes('halodoc') ||
    t.includes('k24') ||
    t.includes('rumah sakit') ||
    t.includes('apotek') ||
    t.includes('vitamin') ||
    t.includes('skincare') ||
    t.includes('skintific') ||
    t.includes('cetaphil') ||
    t.includes('parfum') ||
    t.includes('hmns') ||
    t.includes('gilette') ||
    t.includes('fresh care') ||
    t.includes('potong rambut') ||
    t.includes('scalling')
  ) {
    return 'Kesehatan & Perawatan Diri';
  }

  if (
    t.includes('infaq') ||
    t.includes('sedekah') ||
    t.includes('zakat') ||
    t.includes('donasi') ||
    t.includes('bude') ||
    t.includes('pakde') ||
    t.includes('ibuk') ||
    t.includes('kado') ||
    t.includes('arisan') ||
    t.includes('wedding')
  ) {
    return 'Keluarga & Sosial';
  }

  if (
    t.includes('nonton') ||
    t.includes('bioskop') ||
    t.includes('cgv') ||
    t.includes('netflix') ||
    t.includes('spotify') ||
    t.includes('youtube') ||
    t.includes('game') ||
    t.includes('hangout')
  ) {
    return 'Hiburan & Rekreasi';
  }

  return 'Lainnya';
}

/**
 * Main parser function: accepts Excel buffer or workbook,
 * cleans the rows, handles Initial Income, pairs Transfer Out / In,
 * and produces ready-to-commit transactions.
 */
export function parseExcelWorkbook(fileBuffer: Buffer): ExcelParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

  // Prioritize sheet "Detail Pengeluaran", fallback to first sheet
  const targetSheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes('detail pengeluaran')) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error('Lembar kerja (worksheet) tidak ditemukan dalam berkas Excel.');
  }

  const rawRows: RawExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: '',
  });

  const initialBalances: InitialBalanceItem[] = [];
  const detectedWalletsMap = new Map<string, DetectedWallet>();

  // Intermediate candidate rows for Transfer Out/In pairing
  interface IntermediateRow {
    index: number;
    date: Date;
    dateStr: string;
    description: string;
    paymentMethod: string;
    typeCol: string;
    incomeVal: number;
    expenseVal: number;
    transferVal: number;
    kind: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  }

  const candidates: IntermediateRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Check for "Initial Income" row
    const rawDate = String(row.Date || row.date || '').trim();
    const rawDesc = String(row.Description || row.description || '').trim();
    const rawMethod = String(row['Payment Method'] || row['PaymentMethod'] || row.payment_method || '').trim();
    const rawType = String(row.Type || row.type || '').trim();

    const incomeVal = parseNumber(row.Income || row.income);
    const expenseVal = parseNumber(row.Expenses || row.expenses || row.Expense || row.expense);
    const transferVal = parseNumber(row.Transfer || row.transfer);

    // 1. Initial Income handling
    if (
      rawDate.toLowerCase().includes('initial income') ||
      rawDesc.toLowerCase().includes('initial income') ||
      (rawType.toLowerCase() === 'income' && rawDate.toLowerCase().includes('initial'))
    ) {
      if (rawMethod && incomeVal > 0) {
        const walletInfo = normalizeWallet(rawMethod);
        initialBalances.push({ walletName: walletInfo.name, balance: incomeVal });

        if (!detectedWalletsMap.has(walletInfo.name)) {
          detectedWalletsMap.set(walletInfo.name, {
            ...walletInfo,
            initialBalance: incomeVal,
          });
        } else {
          detectedWalletsMap.get(walletInfo.name)!.initialBalance += incomeVal;
        }
      }
      continue;
    }

    // 2. Ignore Subtotal, Recap, Information rows
    if (
      rawDate.toLowerCase().includes('total') ||
      rawDate.toLowerCase().includes('information') ||
      rawDesc.toLowerCase().includes('total') ||
      rawDate.toLowerCase().includes('income') ||
      rawDate.toLowerCase().includes('expense')
    ) {
      continue;
    }

    // 3. Ignore rows with zero amount
    if (incomeVal === 0 && expenseVal === 0 && transferVal === 0) {
      continue;
    }

    // 4. Parse Date
    const parsedDt = parseExcelDate(row.Date || row.date);
    if (!parsedDt) {
      // No valid date found (e.g. trailing summary footer)
      continue;
    }

    if (!rawMethod) {
      // Row has amount but no wallet method -> skip or fallback
      continue;
    }

    const walletInfo = normalizeWallet(rawMethod);
    if (!detectedWalletsMap.has(walletInfo.name)) {
      detectedWalletsMap.set(walletInfo.name, {
        ...walletInfo,
        initialBalance: 0,
      });
    }

    // Determine type kind
    const typeUpper = rawType.toUpperCase();
    let kind: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN';

    if (typeUpper.includes('TRANSFER OUT') || (transferVal > 0 && typeUpper.includes('OUT'))) {
      kind = 'TRANSFER_OUT';
    } else if (typeUpper.includes('TRANSFER IN') || (transferVal > 0 && typeUpper.includes('IN'))) {
      kind = 'TRANSFER_IN';
    } else if (transferVal > 0) {
      // If transfer amount but type just says Transfer or blank, check desc
      if (rawDesc.toLowerCase().includes('ke ') || rawDesc.toLowerCase().includes('topup') || rawDesc.toLowerCase().includes('tarik')) {
        kind = 'TRANSFER_OUT';
      } else {
        kind = 'TRANSFER_IN';
      }
    } else if (incomeVal > 0) {
      kind = 'INCOME';
    } else {
      kind = 'EXPENSE';
    }

    candidates.push({
      index: i,
      date: parsedDt.date,
      dateStr: parsedDt.dateStr,
      description: rawDesc || `Transaksi ${walletInfo.name}`,
      paymentMethod: walletInfo.name,
      typeCol: rawType,
      incomeVal,
      expenseVal,
      transferVal,
      kind,
    });
  }

  // -------------------------------------------------------------
  // Pairing Transfer Out & Transfer In
  // -------------------------------------------------------------
  const cleanedTransactions: CleanedTransactionItem[] = [];
  const pairedIndices = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (pairedIndices.has(i)) continue;
    const current = candidates[i];

    if (current.kind === 'TRANSFER_OUT') {
      const amount = current.transferVal || current.expenseVal;

      // Look for a matching TRANSFER_IN on the same date with the same amount
      let matchIdx = -1;
      for (let j = 0; j < candidates.length; j++) {
        if (i === j || pairedIndices.has(j)) continue;
        const candidate = candidates[j];

        if (
          candidate.kind === 'TRANSFER_IN' &&
          candidate.dateStr === current.dateStr &&
          (candidate.transferVal === amount || candidate.incomeVal === amount) &&
          candidate.paymentMethod !== current.paymentMethod
        ) {
          matchIdx = j;
          break;
        }
      }

      if (matchIdx !== -1) {
        // Paired into 1 single TRANSFER transaction!
        const matchingIn = candidates[matchIdx];
        pairedIndices.add(i);
        pairedIndices.add(matchIdx);

        cleanedTransactions.push({
          date: current.date,
          dateStr: current.dateStr,
          title: current.description || `Transfer ${current.paymentMethod} -> ${matchingIn.paymentMethod}`,
          walletName: current.paymentMethod,
          destinationWalletName: matchingIn.paymentMethod,
          type: 'TRANSFER',
          amount,
          category: 'Transfer Antar Dompet',
          notes: `Dari ${current.paymentMethod} (${current.description}) ke ${matchingIn.paymentMethod} (${matchingIn.description})`,
        });
      } else {
        // Orphan Transfer Out -> Convert to EXPENSE
        pairedIndices.add(i);
        cleanedTransactions.push({
          date: current.date,
          dateStr: current.dateStr,
          title: current.description,
          walletName: current.paymentMethod,
          type: 'EXPENSE',
          amount,
          category: 'Transfer Keluar / Pihak Ketiga',
          notes: current.typeCol || 'Transfer Out tanpa akun tujuan',
        });
      }
    } else if (current.kind === 'TRANSFER_IN') {
      // If we encounter a TRANSFER_IN that wasn't paired previously, check if an earlier un-paired TRANSFER_OUT matches
      const amount = current.transferVal || current.incomeVal;

      let matchIdx = -1;
      for (let j = 0; j < candidates.length; j++) {
        if (i === j || pairedIndices.has(j)) continue;
        const candidate = candidates[j];

        if (
          candidate.kind === 'TRANSFER_OUT' &&
          candidate.dateStr === current.dateStr &&
          (candidate.transferVal === amount || candidate.expenseVal === amount) &&
          candidate.paymentMethod !== current.paymentMethod
        ) {
          matchIdx = j;
          break;
        }
      }

      if (matchIdx !== -1) {
        const matchingOut = candidates[matchIdx];
        pairedIndices.add(i);
        pairedIndices.add(matchIdx);

        cleanedTransactions.push({
          date: current.date,
          dateStr: current.dateStr,
          title: matchingOut.description || `Transfer ${matchingOut.paymentMethod} -> ${current.paymentMethod}`,
          walletName: matchingOut.paymentMethod,
          destinationWalletName: current.paymentMethod,
          type: 'TRANSFER',
          amount,
          category: 'Transfer Antar Dompet',
          notes: `Dari ${matchingOut.paymentMethod} ke ${current.paymentMethod}`,
        });
      } else {
        // Orphan Transfer In -> Convert to INCOME
        pairedIndices.add(i);
        cleanedTransactions.push({
          date: current.date,
          dateStr: current.dateStr,
          title: current.description,
          walletName: current.paymentMethod,
          type: 'INCOME',
          amount,
          category: 'Transfer Masuk / Titipan',
          notes: current.typeCol || 'Transfer In dari sumber luar',
        });
      }
    } else if (current.kind === 'INCOME') {
      pairedIndices.add(i);
      cleanedTransactions.push({
        date: current.date,
        dateStr: current.dateStr,
        title: current.description,
        walletName: current.paymentMethod,
        type: 'INCOME',
        amount: current.incomeVal,
        category: detectCategory(current.description, 'INCOME'),
        notes: current.typeCol,
      });
    } else if (current.kind === 'EXPENSE') {
      pairedIndices.add(i);
      cleanedTransactions.push({
        date: current.date,
        dateStr: current.dateStr,
        title: current.description,
        walletName: current.paymentMethod,
        type: 'EXPENSE',
        amount: current.expenseVal,
        category: detectCategory(current.description, 'EXPENSE'),
        notes: current.typeCol,
      });
    }
  }

  // Also convert Initial Balances into initial Income transactions so full historical reporting aligns
  initialBalances.forEach((init) => {
    cleanedTransactions.unshift({
      date: new Date(2025, 1, 1), // Feb 1, 2025 or earliest date
      dateStr: '2025-02-01',
      title: `Saldo Awal (${init.walletName})`,
      walletName: init.walletName,
      type: 'INCOME',
      amount: init.balance,
      category: 'Saldo Awal',
      notes: 'Initial Income dari Excel',
      isInitial: true,
    });
  });

  // Calculate summary metrics
  let incomeCount = 0;
  let incomeTotal = 0;
  let expenseCount = 0;
  let expenseTotal = 0;
  let transferCount = 0;
  let transferTotal = 0;

  for (const t of cleanedTransactions) {
    if (t.type === 'INCOME') {
      incomeCount++;
      incomeTotal += t.amount;
    } else if (t.type === 'EXPENSE') {
      expenseCount++;
      expenseTotal += t.amount;
    } else if (t.type === 'TRANSFER') {
      transferCount++;
      transferTotal += t.amount;
    }
  }

  return {
    initialBalances,
    transactions: cleanedTransactions,
    detectedWallets: Array.from(detectedWalletsMap.values()),
    summary: {
      totalRows: rawRows.length,
      validTransactions: cleanedTransactions.length,
      incomeCount,
      incomeTotal,
      expenseCount,
      expenseTotal,
      transferCount,
      transferTotal,
    },
  };
}
