function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }

  return result;
}

export const MATRIX_CHARSET: number[] = [
  ...range(0x41, 0x5A), // A-Z
  ...range(0x61, 0x7A), // A-Za-z
];
