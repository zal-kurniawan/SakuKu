/**
 * Helper to auto title-case transaction descriptions/titles.
 * Preserves common acronyms in all caps (e.g., BCA, BNI, PLN, QRIS).
 */
export function formatTransactionTitle(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      // Pertahankan singkatan yang sudah huruf kapital semua (misal: BCA, BNI, PLN, QRIS)
      if (word.length > 1 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
