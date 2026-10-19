import {charDisplayWidth} from '../../utils/string-width';

export const CHAR_CATEGORY_WORD = 0;
export const CHAR_CATEGORY_SPACE = 1;
export const CHAR_CATEGORY_PUNCT = 2;
export const CHAR_CATEGORY_CJK = 3;

export function charIndexAtColumn(text: string, column: number): number {
  let width = 0;
  let index = 0;
  for (const char of text) {
    const cw = charDisplayWidth(char);
    if (width + cw > column) {
      break;
    }

    width += cw;
    index++;
  }

  return index;
}

export function charCategory(code: number): number {
  if (code <= 0x20) {
    return CHAR_CATEGORY_SPACE;
  }

  if ((code >= 0x4E_00 && code <= 0x9F_FF) || (code >= 0x34_00 && code <= 0x4D_BF) || (code >= 0x30_00 && code <= 0x30_3F) || (code >= 0xFF_00 && code <= 0xFF_EF)) {
    return CHAR_CATEGORY_CJK;
  }

  return (code >= 0x21 && code <= 0x2F) || (code >= 0x3A && code <= 0x40) || (code >= 0x5B && code <= 0x60) || (code >= 0x7B && code <= 0x7E) ? CHAR_CATEGORY_PUNCT : CHAR_CATEGORY_WORD;
}
