import { base32Encode, base32Decode, generateTotp, verifyTotp, getCurrentTotpStep } from './totp';

console.log('Testing TOTP Implementation...');

// 1. Base32 test
const original = Buffer.from('Hello SakuKu Security!');
const encoded = base32Encode(original);
const decoded = base32Decode(encoded);
if (original.equals(decoded)) {
  console.log('✓ Base32 Encode & Decode test PASSED');
} else {
  console.error('❌ Base32 Encode & Decode test FAILED');
  process.exit(1);
}

// 2. TOTP Generation & Verification test
const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'; // Standard Base32 test secret
const code = generateTotp(secret);
console.log('Generated TOTP code:', code);

const verifyResult = verifyTotp(code, secret, null);
if (verifyResult.valid) {
  console.log('✓ TOTP verification PASSED with step:', verifyResult.step);
} else {
  console.error('❌ TOTP verification FAILED:', verifyResult.error);
  process.exit(1);
}

// 3. Anti-replay test
const replayResult = verifyTotp(code, secret, verifyResult.step);
if (!replayResult.valid && replayResult.error === 'REPLAYED') {
  console.log('✓ Anti-Replay protection PASSED (disallowed duplicate code reuse)');
} else {
  console.error('❌ Anti-Replay protection FAILED:', replayResult);
  process.exit(1);
}

// 4. Invalid code test
const invalidResult = verifyTotp('000000', secret, null);
if (!invalidResult.valid && invalidResult.error === 'INVALID_CODE') {
  console.log('✓ Invalid code rejection PASSED');
} else {
  console.error('❌ Invalid code rejection FAILED');
  process.exit(1);
}

console.log('🎉 ALL TOTP TESTS PASSED 100%!');
