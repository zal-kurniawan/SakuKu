export const CATEGORY_TRANSLATIONS: Record<string, { id: string; en: string }> = {
  'Makanan & Minuman': { id: 'Makanan & Minuman', en: 'Food & Beverages' },
  'Transportasi': { id: 'Transportasi', en: 'Transportation' },
  'Tagihan & Utilitas': { id: 'Tagihan & Utilitas', en: 'Bills & Utilities' },
  'Belanja': { id: 'Belanja', en: 'Shopping' },
  'Kesehatan': { id: 'Kesehatan', en: 'Health' },
  'Hiburan': { id: 'Hiburan', en: 'Entertainment' },
  'Donasi & Sosial': { id: 'Donasi & Sosial', en: 'Donation & Social' },
  'Pendidikan': { id: 'Pendidikan', en: 'Education' },
  'Lainnya': { id: 'Lainnya', en: 'Others' },
  'Gaji': { id: 'Gaji', en: 'Salary' },
  'Freelance': { id: 'Freelance', en: 'Freelance' },
  'Bonus/THR': { id: 'Bonus/THR', en: 'Bonus / Holiday Allowance' },
  'Bonus': { id: 'Bonus', en: 'Bonus' },
  'Investasi': { id: 'Investasi', en: 'Investment' },
  'Investasi & Tabungan': { id: 'Investasi & Tabungan', en: 'Investment & Savings' },
  'Penjualan/Refund': { id: 'Penjualan/Refund', en: 'Sales / Refund' },
  'Hadiah': { id: 'Hadiah', en: 'Gift' },
  'Pemasukan Lainnya': { id: 'Pemasukan Lainnya', en: 'Other Income' },
  'Transfer Antar Dompet': { id: 'Transfer Antar Dompet', en: 'Inter-Wallet Transfer' },
  'Tarik Tunai': { id: 'Tarik Tunai', en: 'Cash Withdrawal' },
  'Top Up': { id: 'Top Up', en: 'Top Up' },
  'Transfer Keluar / Pihak Ketiga': { id: 'Transfer Keluar / Pihak Ketiga', en: 'Transfer Out / Third Party' },
  'Transfer Masuk / Titipan': { id: 'Transfer Masuk / Titipan', en: 'Transfer In / Deposit' },
};

/**
 * Returns the localized label for standard categories based on active locale.
 * Preserves custom user-created category names if they don't match built-in categories.
 */
export function getCategoryLabel(
  category: string,
  locale: string = 'id',
  t?: (key: string, fallback?: string) => string
): string {
  if (!category) return category;
  const match = CATEGORY_TRANSLATIONS[category];
  if (match) {
    return locale === 'en' ? match.en : match.id;
  }
  return category;
}
