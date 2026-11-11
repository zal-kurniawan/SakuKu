import {
  parseBatchIncomingMessage,
  parseIncomingMessage,
  parseAmount,
} from './parser';

console.log('====================================================');
console.log('🧪 TESTING SAKUKU PARSER & MULTI-LINE BATCH ENGINE');
console.log('====================================================');

// 1. Test Amount Parsing
const testAmounts = [
  { input: '35k', expected: 35000 },
  { input: '50rb', expected: 50000 },
  { input: '2.5jt', expected: 2500000 },
  { input: '100000', expected: 100000 },
  { input: '150.000', expected: 150000 },
];

for (const { input, expected } of testAmounts) {
  const result = parseAmount(input);
  if (result !== expected) {
    console.error(`❌ parseAmount failed for "${input}": got ${result}, expected ${expected}`);
    process.exit(1);
  } else {
    console.log(`✓ parseAmount("${input}") = ${result}`);
  }
}

// 2. Test Multi-Line Batch Parsing
const batchMessage = `
insert | makan siang | bca | expense | 35k
insert | beli kopi | gopay | expense | 18k
tf | bca | gopay | 50k | top up
`;

const parsedBatch = parseBatchIncomingMessage(batchMessage);
console.log(`\n📋 Parsed Batch (${parsedBatch.length} items):`);
parsedBatch.forEach((item, idx) => {
  console.log(`  [Line ${idx + 1}] Kind: ${item.kind}, Raw: "${item.raw}"`);
});

if (parsedBatch.length !== 3) {
  console.error(`❌ Expected 3 batch items, got ${parsedBatch.length}`);
  process.exit(1);
}

const [item1, item2, item3] = parsedBatch;

if (
  item1.kind === 'TRANSACTION' &&
  item1.title === 'makan siang' &&
  item1.walletName === 'bca' &&
  item1.type === 'EXPENSE' &&
  item1.amount === 35000
) {
  console.log('✓ Batch Item 1 (Expense BCA 35k) PASSED');
} else {
  console.error('❌ Batch Item 1 FAILED', item1);
  process.exit(1);
}

if (
  item2.kind === 'TRANSACTION' &&
  item2.title === 'beli kopi' &&
  item2.walletName === 'gopay' &&
  item2.type === 'EXPENSE' &&
  item2.amount === 18000
) {
  console.log('✓ Batch Item 2 (Expense GoPay 18k) PASSED');
} else {
  console.error('❌ Batch Item 2 FAILED', item2);
  process.exit(1);
}

if (
  item3.kind === 'TRANSFER' &&
  item3.fromWalletName === 'bca' &&
  item3.toWalletName === 'gopay' &&
  item3.amount === 50000 &&
  item3.notes === 'top up'
) {
  console.log('✓ Batch Item 3 (Transfer BCA -> GoPay 50k) PASSED');
} else {
  console.error('❌ Batch Item 3 FAILED', item3);
  process.exit(1);
}

// 3. Test Slash Commands
const cmdSaldo = parseIncomingMessage('/saldo');
const cmdRekapHari = parseIncomingMessage('/rekap hari ini');
const cmdRekapBulan = parseIncomingMessage('/rekap bulan ini');
const cmdHelp = parseIncomingMessage('/help');

if (
  cmdSaldo.kind === 'COMMAND' &&
  cmdSaldo.command === 'SALDO' &&
  cmdRekapHari.kind === 'COMMAND' &&
  cmdRekapHari.command === 'REKAP_TODAY' &&
  cmdRekapBulan.kind === 'COMMAND' &&
  cmdRekapBulan.command === 'REKAP_MONTH' &&
  cmdHelp.kind === 'COMMAND' &&
  cmdHelp.command === 'HELP'
) {
  console.log('✓ All Slash Commands PASSED');
} else {
  console.error('❌ Slash Commands FAILED');
  process.exit(1);
}

console.log('\n🎉 ALL SAKUKU PARSER TESTS PASSED 100% SUCCESSFULLY!\n');
