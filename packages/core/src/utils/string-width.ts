export function charDisplayWidth(char: string): number {
  const code = char.codePointAt(0)!;
  if (code < 0x20 || code === 0x7F) {
    return 0;
  }

  if ((code >= 0x4E_00 && code <= 0x9F_FF)
    || (code >= 0x34_00 && code <= 0x4D_BF)
    || (code >= 0x30_00 && code <= 0x30_3F)
    || (code >= 0x30_40 && code <= 0x30_9F)
    || (code >= 0x30_A0 && code <= 0x30_FF)
    || (code >= 0xAC_00 && code <= 0xD7_AF)
    || (code >= 0xFF_01 && code <= 0xFF_60)
    || (code >= 0xF9_00 && code <= 0xFA_FF)
    || (code >= 0x2E_80 && code <= 0x2F_DF)
    || (code >= 0x31_00 && code <= 0x31_8F)
    || (code >= 0x32_00 && code <= 0x33_FF)
    || (code >= 0xFE_30 && code <= 0xFE_4F)
    || (code >= 0x26_00 && code <= 0x27_BF)
    || (code >= 0x1_F3_00 && code <= 0x1_F9_FF)) {
    return 2;
  }

  return 1;
}

export function stringDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += charDisplayWidth(char);
  }

  return width;
}

export function truncateToWidth(text: string, maxWidth: number): string {
  let width = 0;
  let index = 0;
  for (const char of text) {
    const cw = charDisplayWidth(char);
    if (width + cw > maxWidth) {
      break;
    }

    width += cw;
    index++;
  }

  return text.slice(0, index);
}
