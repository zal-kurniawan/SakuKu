import * as XLSX from 'xlsx';
import { parseExcelWorkbook } from './excel-parser';

console.log('====================================================');
console.log('🧪 TESTING EXCEL PARSER WITH REAL USER DATASET');
console.log('====================================================');

// Sample dataset snippet provided by the user
const sampleCsv = `Date,Description,Payment Method,Type,Income,Expenses,Transfer
Initial Income,,Cash,Income,2000,,
Initial Income,,BNI,Income,4550900,,
Initial Income,,Jago,Income,2262030,,
Total Initial Income,,,,6814930,,
2025-02-01,,,,,,
,,,,,,
2025-02-10,Makan Siang & Sore,Jago,Expense,,34975,
2025-02-10,Sbn,Bni,Income,140574,,
,,,,,,
2025-02-14,Transfer BRI,Bni,Transfer Out,,,50000
2025-02-14,Admin Tf Antar Bank,Bni,Expense,,2500,
2025-02-14,Tarik Tunai,Cash,Transfer In,,,50000
,,,,,,
2025-02-28,Transfer Ke Jago (Bulanan),Bni,Transfer Out,,,3500000
2025-02-28,Transfer Dari Bni,Jago,Transfer In,,,3500000
2025-02-28,Topup Shopee,Jago,Transfer Out,,,124000
February 2025 Income,,,,11947945,,
February 2025 Expenses,,,,8176552,,
2026-05-25,Dividen Bmri,Jagl,Income,301566,,
2025-03-09,Cash Dari Bude,Cash,Transfer In,,,150000
2025-03-10,Hutang,Bni,Transfer In,,,400000
 Information,Amount
Total Income,338094649
Total Expenses,280592777
`;

// Create workbook from CSV string
const wb = XLSX.read(sampleCsv, { type: 'string' });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const result = parseExcelWorkbook(excelBuffer);

console.log('📊 PARSE RESULT SUMMARY:');
console.log(`  - Total Transactions: ${result.transactions.length}`);
console.log(`  - Detected Wallets: ${result.detectedWallets.map(w => w.name).join(', ')}`);
console.log(`  - Initial Balances:`, result.initialBalances);
console.log(`  - Income count: ${result.summary.incomeCount} (Total: Rp ${result.summary.incomeTotal.toLocaleString('id-ID')})`);
console.log(`  - Expense count: ${result.summary.expenseCount} (Total: Rp ${result.summary.expenseTotal.toLocaleString('id-ID')})`);
console.log(`  - Transfer count: ${result.summary.transferCount} (Total: Rp ${result.summary.transferTotal.toLocaleString('id-ID')})`);

// 1. Verify Initial Balances
if (result.initialBalances.length !== 3) {
  console.error('❌ Expected 3 initial balances, got:', result.initialBalances.length);
  process.exit(1);
}
console.log('✓ Initial balances verified');

// 2. Verify Paired Transfers
const paired3500 = result.transactions.find(
  t => t.type === 'TRANSFER' && t.amount === 3500000 && t.walletName === 'BNI' && t.destinationWalletName === 'Jago'
);
if (!paired3500) {
  console.error('❌ Failed to find paired transfer BNI -> Jago 3.5jt');
  process.exit(1);
}
console.log('✓ Paired transfer BNI -> Jago 3.5jt verified:', paired3500.title);

const paired50k = result.transactions.find(
  t => t.type === 'TRANSFER' && t.amount === 50000 && t.walletName === 'BNI' && t.destinationWalletName === 'Cash'
);
if (!paired50k) {
  console.error('❌ Failed to find paired transfer BNI -> Cash 50k');
  process.exit(1);
}
console.log('✓ Paired transfer BNI -> Cash 50k (Tarik Tunai) verified:', paired50k.title);

// 3. Verify Orphan Transfer Out -> Expense
const orphanOut = result.transactions.find(
  t => t.type === 'EXPENSE' && t.amount === 124000 && t.title.includes('Topup Shopee')
);
if (!orphanOut) {
  console.error('❌ Failed to find orphan transfer out converted to expense');
  process.exit(1);
}
console.log('✓ Orphan Transfer Out converted to Expense verified:', orphanOut.category);

// 4. Verify Orphan Transfer In -> Income
const orphanIn = result.transactions.find(
  t => t.type === 'INCOME' && t.amount === 150000 && t.title.includes('Cash Dari Bude')
);
if (!orphanIn) {
  console.error('❌ Failed to find orphan transfer in converted to income');
  process.exit(1);
}
console.log('✓ Orphan Transfer In converted to Income verified:', orphanIn.category);

// 5. Verify Typo "Jagl" normalized to "Jago"
const typoDividen = result.transactions.find(
  t => t.title.includes('Dividen Bmri') && t.walletName === 'Jago'
);
if (!typoDividen) {
  console.error('❌ Typo "Jagl" was NOT normalized to "Jago"');
  process.exit(1);
}
console.log('✓ Typo "Jagl" successfully normalized to "Jago"');

console.log('\n🎉 ALL EXCEL PARSER VALIDATIONS PASSED WITH FLYING COLORS!\n');
