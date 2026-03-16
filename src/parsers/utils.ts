export function isWhitespace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

export function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

export function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

export interface BracketError {
  position: number;
  message: string;
}

/**
 * Check that all brackets/parentheses are balanced in a source string.
 * Returns null if balanced, or an error with position if not.
 */
export function checkBracketBalance(src: string): BracketError | null {
  let depth = 0;
  let inQuote: string | 0 = 0;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuote) {
      if (ch === inQuote && src[i - 1] !== '\\') inQuote = 0;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth < 0) {
        return { position: i, message: 'Unexpected closing parenthesis' };
      }
    }
  }

  if (depth !== 0) {
    return {
      position: src.length - 1,
      message: 'Unbalanced parentheses: missing closing parenthesis',
    };
  }

  return null;
}

export interface ScannedToken {
  value: string;
  isComma: boolean;
  isSlash: boolean;
  offset: number;
}

/**
 * Tokenize a style value string following tasty's scan() semantics:
 * - Whitespace splits tokens
 * - Commas separate groups
 * - Spaced slashes (`a / b`) separate parts
 * - Non-spaced slashes (`center/cover`) stay inside the token
 * - Parenthesized content stays as a single token
 * - Quoted strings stay as a single token
 * - `url(...)` content is never split
 */
export function scanTokens(src: string): ScannedToken[] {
  const result: ScannedToken[] = [];
  let depth = 0;
  let inUrl = false;
  let inQuote: string | 0 = 0;
  let start = 0;
  let i = 0;
  let pendingSlash = false;

  const flush = (isComma: boolean, isSlash: boolean) => {
    const actualSlash = isSlash || pendingSlash;
    pendingSlash = false;

    if (start < i) {
      result.push({
        value: src.slice(start, i),
        isComma,
        isSlash: actualSlash,
        offset: start,
      });
    } else if (isComma) {
      result.push({ value: '', isComma: true, isSlash: false, offset: i });
    } else if (actualSlash) {
      result.push({ value: '', isComma: false, isSlash: true, offset: i });
    }
    start = i + 1;
  };

  for (; i < src.length; i++) {
    const ch = src[i];

    if (inQuote) {
      if (ch === inQuote && src[i - 1] !== '\\') inQuote = 0;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (ch === '(') {
      if (!depth) {
        const maybe = src.slice(Math.max(0, i - 3), i + 1);
        if (maybe === 'url(') inUrl = true;
      }
      depth++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      if (inUrl && depth === 0) inUrl = false;
      continue;
    }

    if (inUrl) continue;

    if (!depth) {
      if (ch === ',') {
        flush(true, false);
        continue;
      }
      if (ch === '/') {
        const prevIsWs = isWhitespace(src[i - 1]);
        const nextIsWs = isWhitespace(src[i + 1]);
        if (prevIsWs && nextIsWs) {
          pendingSlash = true;
          start = i + 1;
          continue;
        }
        continue;
      }
      if (isWhitespace(ch)) {
        flush(false, false);
        continue;
      }
    }
  }
  flush(false, false);

  return result;
}
