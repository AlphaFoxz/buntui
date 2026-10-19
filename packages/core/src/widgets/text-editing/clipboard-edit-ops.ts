export function insertTextAt(value: string, offset: number, insert: string): string {
  return value.slice(0, offset) + insert + value.slice(offset);
}

export function clampInsertText(insert: string, valueLength: number, maxLength: number): string {
  if (maxLength > 0 && valueLength >= maxLength) {
    return '';
  }

  const available = maxLength === 0 ? insert.length : maxLength - valueLength;
  return insert.slice(0, available);
}
