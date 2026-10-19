export type SelectionRange = {start: number; end: number};

export function normalizeSelectionRange(anchor: number, cursor: number): SelectionRange | undefined {
  if (anchor === cursor) {
    return undefined;
  }

  return anchor < cursor ? {start: anchor, end: cursor} : {start: cursor, end: anchor};
}

export function deleteRange(value: string, range: SelectionRange): {value: string; cursor: number} {
  return {
    value: value.slice(0, range.start) + value.slice(range.end),
    cursor: range.start,
  };
}
