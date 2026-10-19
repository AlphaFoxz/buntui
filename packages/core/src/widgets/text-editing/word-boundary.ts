import {charCategory} from './text-measure';

export function wordRangeAt(text: string, pos: number): [number, number] {
  if (text.length === 0) {
    return [0, 0];
  }

  const clamped = Math.min(pos, text.length - 1);
  let start = clamped;
  let end = clamped;
  const cat = charCategory(text.codePointAt(clamped)!);
  while (start > 0 && charCategory(text.codePointAt(start - 1)!) === cat) {
    start--;
  }

  while (end < text.length && charCategory(text.codePointAt(end)!) === cat) {
    end++;
  }

  return [start, end];
}

export function wordStartBefore(text: string, pos: number): number {
  if (pos <= 0) {
    return 0;
  }

  let p = pos;
  const cat = charCategory(text.codePointAt(p - 1)!);
  p--;
  while (p > 0 && charCategory(text.codePointAt(p - 1)!) === cat) {
    p--;
  }

  return p;
}

export function wordEndAfter(text: string, pos: number): number {
  const {length} = text;
  if (pos >= length) {
    return pos;
  }

  let p = pos;
  const cat = charCategory(text.codePointAt(p)!);
  p++;
  while (p < length && charCategory(text.codePointAt(p)!) === cat) {
    p++;
  }

  return p;
}
