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
  const locals = collectArrowParameters(expr);
  return wrapCore(expr, locals);
}

function wrapCore(expr: string, locals: Set<string>): string {
  let result = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;

    if (ch === '`') {
      const parsed = parseTemplateLiteral(expr, i, locals);
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
        result += i >= 3 && expr[i - 2]! === '.' && expr[i - 3]! === '.' ? `${UNREF}(${ident})` : ident;
      } else if (CONDITION_KEYWORDS.has(ident)) {
        result += ident;
      } else if (isObjectKey(expr, i, end)) {
        result += ident;
      } else if (locals.has(ident)) {
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

function parseTemplateLiteral(expr: string, start: number, locals: Set<string>): {content: string; end: number} {
  let i = start + 1;
  let content = '';
  while (i < expr.length && expr[i]! !== '`') {
    if (expr[i]! === '$' && expr[i + 1] === '{') {
      content += '${';
      i += 2;
      const inner = parseBraceBlock(expr, i);
      const innerLocals = new Set(locals);
      for (const parameter of collectArrowParameters(inner.text)) {
        innerLocals.add(parameter);
      }

      content += wrapCore(inner.text, innerLocals) + '}';
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

function isObjectKey(expr: string, identStart: number, identEnd: number): boolean {
  if (identEnd >= expr.length || expr[identEnd]! !== ':') {
    return false;
  }

  for (let j = identStart - 1; j >= 0; j--) {
    const c = expr[j]!;
    if (c === '{' || c === ',') {
      return true;
    }

    if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
      return false;
    }
  }

  return false;
}

function skipTemplateLiteral(expr: string, start: number): number {
  let j = start + 1;
  while (j < expr.length && expr[j]! !== '`') {
    if (expr[j]! === '$' && expr[j + 1] === '{') {
      j = skipBraceBlockForward(expr, j + 2);
    } else {
      j++;
    }
  }

  if (j < expr.length) {
    j++;
  }

  return j;
}

function skipBraceBlockForward(expr: string, start: number): number {
  let depth = 1;
  let j = start;
  while (j < expr.length && depth > 0) {
    if (expr[j]! === '{') {
      depth++;
    } else if (expr[j]! === '}') {
      depth--;
    }

    j++;
  }

  return j;
}

type ArrowParameterResult
  = | {type: 'none'}
    | {type: 'parens'; text: string}
    | {type: 'ident'; name: string};

function findArrowParameterStart(expr: string, arrowPos: number): ArrowParameterResult {
  let j = arrowPos - 1;
  while (j >= 0 && (expr[j]! === ' ' || expr[j]! === '\t' || expr[j]! === '\n' || expr[j]! === '\r')) {
    j--;
  }

  if (j >= 0 && expr[j] === ')') {
    let depth = 1;
    let k = j - 1;
    while (k >= 0 && depth > 0) {
      if (expr[k]! === ')') {
        depth++;
      } else if (expr[k]! === '(') {
        depth--;
      }

      k--;
    }

    return {type: 'parens', text: expr.slice(k + 2, j)};
  }

  if (j >= 0 && /[\w$]/v.test(expr[j]!)) {
    let k = j;
    while (k >= 0 && /[\w$]/v.test(expr[k]!)) {
      k--;
    }

    return {type: 'ident', name: expr.slice(k + 1, j + 1)};
  }

  return {type: 'none'};
}

function collectArrowParameters(expr: string): Set<string> {
  const parameters = new Set<string>();
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;

    if (ch === '\'' || ch === '"') {
      const parsed = parseStringLiteral(expr, i, ch);
      i = parsed.end;
      continue;
    }

    if (ch === '`') {
      i = skipTemplateLiteral(expr, i);
      continue;
    }

    if (ch === '=' && i + 1 < expr.length && expr[i + 1]! === '>') {
      const parameterStart = findArrowParameterStart(expr, i);
      if (parameterStart.type === 'parens') {
        extractParameterNames(parameterStart.text, parameters);
      } else if (parameterStart.type === 'ident' && !CONDITION_KEYWORDS.has(parameterStart.name)) {
        parameters.add(parameterStart.name);
      }
    }

    i++;
  }

  return parameters;
}

function extractParameterNames(string_: string, parameters: Set<string>): void {
  let i = 0;
  while (i < string_.length) {
    while (i < string_.length && (string_[i]! === ' ' || string_[i]! === '\t' || string_[i]! === ',' || string_[i]! === '\n' || string_[i]! === '\r')) {
      i++;
    }

    if (i >= string_.length) {
      break;
    }

    if (/[a-zA-Z_$]/v.test(string_[i]!)) {
      const start = i;
      while (i < string_.length && /[\w$]/v.test(string_[i]!)) {
        i++;
      }

      const name = string_.slice(start, i);
      if (!CONDITION_KEYWORDS.has(name)) {
        parameters.add(name);
      }
    } else {
      i++;
    }
  }
}

export function wrapConditionExpr(expr: string): string {
  return wrapExpr(expr);
}
