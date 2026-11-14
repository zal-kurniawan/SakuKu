import crypto from 'crypto';

/**
 * RFC 6238 Time-based One-time Password (TOTP) & RFC 4226 HMAC-based One-time Password (HOTP)
 * Zero external dependencies — built strictly on Node.js native `crypto`.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(base32Str: string): Buffer {
  const cleaned = base32Str.toUpperCase().replace(/[\s-=]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base32 character encountered: "${char}"`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Encodes a Buffer into a Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generates an RFC 4226 HOTP 6-digit code for a given 64-bit integer counter
 */
export function generateHotp(secretBuf: Buffer, counter: number | bigint): string {
  const counterBig = BigInt(counter);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(counterBig);

  const hmac = crypto.createHmac('sha1', secretBuf).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % 1_000_000;
  return otp.toString().padStart(6, '0');
}

/**
 * Computes the current 30-second TOTP step
 */
export function getCurrentTotpStep(timestampMs: number = Date.now(), stepSeconds: number = 30): bigint {
  return BigInt(Math.floor(timestampMs / 1000 / stepSeconds));
}

/**
 * Generates the current TOTP 6-digit code for a Base32 secret
 */
export function generateTotp(base32Secret: string, timestampMs: number = Date.now()): string {
  const secretBuf = base32Decode(base32Secret);
  const step = getCurrentTotpStep(timestampMs);
  return generateHotp(secretBuf, step);
}

export interface VerifyTotpResult {
  valid: boolean;
  step?: bigint;
  error?: 'INVALID_CODE' | 'REPLAYED' | 'INVALID_SECRET';
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret with +/- 1 time step tolerance (+/- 30s)
 * Enforces anti-replay by requiring matched step > lastUsedStep.
 */
export function verifyTotp(
  code: string,
  base32Secret: string,
  lastUsedStep?: bigint | number | null,
  timestampMs: number = Date.now()
): VerifyTotpResult {
  const trimmedCode = code.trim();
  if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
    return { valid: false, error: 'INVALID_CODE' };
  }

  let secretBuf: Buffer;
  try {
    secretBuf = base32Decode(base32Secret);
  } catch {
    return { valid: false, error: 'INVALID_SECRET' };
  }

  const currentStep = getCurrentTotpStep(timestampMs);
  const lastStepBig = lastUsedStep !== undefined && lastUsedStep !== null ? BigInt(lastUsedStep) : null;

  // Tolerance window of +/- 1 step (-30s, 0s, +30s)
  const candidateSteps = [currentStep, currentStep - 1n, currentStep + 1n];

  for (const step of candidateSteps) {
    const generated = generateHotp(secretBuf, step);
    if (generated === trimmedCode) {
      // Check Anti-Replay: Disallow code reuse within the same or earlier step
      if (lastStepBig !== null && step <= lastStepBig) {
        return { valid: false, error: 'REPLAYED', step };
      }
      return { valid: true, step };
    }
  }

  return { valid: false, error: 'INVALID_CODE' };
}
