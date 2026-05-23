import {RUNTIME_HELPERS} from '../runtime-helpers';

const {UNREF} = RUNTIME_HELPERS;

const CONDITION_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'typeof',
  'void',
  'in',
  'of',
  'instanceof',
  'new',
  'delete',
  'return',
  'throw',
]);

export function wrapExpr(expr: string): string {
  let result = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;

    if (ch === '`') {
      const parsed = parseTemplateLiteral(expr, i);
      result += '`' + parsed.content + '`';
      i = parsed.end;
    } else if (ch === '\'' || ch === '"') {
      const start = i;
      const parsed = parseStringLiteral(expr, i, ch);
      result += expr.slice(start, parsed.end);
      i = parsed.end;
    } else if (/[a-zA-Z_$]/v.test(ch)) {
      const {ident, end} = parseIdentifier(expr, i);
      if (end < expr.length && expr[end]! === '(') {
        result += ident;
      } else if (i > 0 && expr[i - 1] === '.') {
        result += ident;
      } else if (CONDITION_KEYWORDS.has(ident)) {
        result += ident;
      } else {
        result += `${UNREF}(${ident})`;
      }

      i = end;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

function parseTemplateLiteral(expr: string, start: number): {content: string; end: number} {
  let i = start + 1;
  let content = '';
  while (i < expr.length && expr[i]! !== '`') {
    if (expr[i]! === '$' && expr[i + 1] === '{') {
      content += '${';
      i += 2;
      const inner = parseBraceBlock(expr, i);
      content += wrapIdentifiers(inner.text) + '}';
      i = inner.end;
    } else {
      content += expr[i]!;
      i++;
    }
  }

  if (i < expr.length && expr[i]! === '`') {
    i++;
  }

  return {content, end: i};
}

function parseBraceBlock(expr: string, start: number): {text: string; end: number} {
  let depth = 1;
  let i = start;
  let text = '';
  while (i < expr.length && depth > 0) {
    if (expr[i]! === '{') {
      depth++;
    } else if (expr[i]! === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }

    text += expr[i]!;
    i++;
  }

  return {text, end: i};
}

function parseStringLiteral(expr: string, start: number, quote: string): {end: number} {
  let i = start + 1;
  while (i < expr.length && expr[i]! !== quote) {
    if (expr[i]! === '\\') {
      i++;
    }

    i++;
  }

  return {end: i + 1};
}

function parseIdentifier(expr: string, start: number): {ident: string; end: number} {
  let i = start;
  while (i < expr.length && /[\w$]/v.test(expr[i]!)) {
    i++;
  }

  return {ident: expr.slice(start, i), end: i};
}

function wrapIdentifiers(expr: string): string {
  let result = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;

    if (ch === '`') {
      const parsed = parseTemplateLiteral(expr, i);
      result += expr.slice(i, parsed.end);
      i = parsed.end;
    } else if (ch === '\'' || ch === '"') {
      const parsed = parseStringLiteral(expr, i, ch);
      result += expr.slice(i, parsed.end);
      i = parsed.end;
    } else if (/[a-zA-Z_$]/v.test(ch)) {
      const {ident, end} = parseIdentifier(expr, i);
      if (end < expr.length && expr[end]! === '(') {
        result += ident;
      } else if (i > 0 && expr[i - 1] === '.') {
        result += ident;
      } else if (CONDITION_KEYWORDS.has(ident)) {
        result += ident;
      } else {
        result += `${UNREF}(${ident})`;
      }

      i = end;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

export function wrapConditionExpr(expr: string): string {
  return wrapExpr(expr);
}
