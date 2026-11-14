import {
  isValidHex,
  normalizeHex,
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  PRESET_COLORS,
} from '../components/ui/CustomColorPicker';

console.log('Testing CustomColorPicker Color Conversion Math...');

// Test 1: Validation
const validHexes = ['#005CAA', '#f97316', 'EF4444', '#fff', '123', '#AbC'];
for (const h of validHexes) {
  if (!isValidHex(h)) {
    throw new Error(`Expected ${h} to be valid hex`);
  }
}
console.log('✓ Hex validation passed for all valid patterns');

const invalidHexes = ['#gg0000', '12', '#12345', 'hello', '#1234567'];
for (const h of invalidHexes) {
  if (isValidHex(h)) {
    throw new Error(`Expected ${h} to be invalid hex`);
  }
}
console.log('✓ Hex rejection passed for invalid patterns');

// Test 2: Normalization
if (normalizeHex('#fff') !== '#FFFFFF') throw new Error('normalizeHex 3-digit failed');
if (normalizeHex('005caa') !== '#005CAA') throw new Error('normalizeHex 6-digit failed');
console.log('✓ Normalization passed');

// Test 3: Roundtrip conversion for all SakuKu preset colors
for (const color of PRESET_COLORS) {
  const hsv = hexToHsv(color);
  const reconstructed = hsvToHex(hsv.h, hsv.s, hsv.v);
  if (reconstructed.toUpperCase() !== color.toUpperCase()) {
    throw new Error(`Mismatch for preset ${color}: got ${reconstructed}`);
  }
}
console.log('✓ 100% Exact Roundtrip conversion passed for all 8 SakuKu presets');

// Test 4: Pure Red, Green, Blue, Black, White
const primaries = ['#FF0000', '#00FF00', '#0000FF', '#000000', '#FFFFFF'];
for (const color of primaries) {
  const hsv = hexToHsv(color);
  const reconstructed = hsvToHex(hsv.h, hsv.s, hsv.v);
  if (reconstructed.toUpperCase() !== color.toUpperCase()) {
    throw new Error(`Mismatch for ${color}: got ${reconstructed}`);
  }
}
console.log('✓ 100% Exact Roundtrip conversion passed for Primary colors');

console.log('🎉 ALL COLOR PICKER MATH TESTS PASSED 100%!');
