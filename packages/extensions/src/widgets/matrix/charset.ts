function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }

  return result;
}

/**
 * Character code pool matching the visual flavor of real cmatrix.
 * Half-width katakana, latin, digits, and punctuation.
 */
export const MATRIX_CHARSET: number[] = [
  ...range(0xFF_66, 0xFF_9D), // Half-width katakana
  ...range(0x41, 0x5A), // A-Z
  ...range(0x61, 0x7A), // A-z
  ...range(0x30, 0x39), // 0-9
  0x21,
  0x40,
  0x23,
  0x24,
  0x25,
  0x5E,
  0x26,
  0x2A, // Punctuation
];
