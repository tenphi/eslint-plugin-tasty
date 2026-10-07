export interface ValueWord {
  value: string;
  offset: number;
  isFunction: boolean;
}

interface Span {
  start: number;
  end: number;
}

function scan(value: string): { words: ValueWord[]; opaque: Span[] } {
  const words: ValueWord[] = [];
  const opaque: Span[] = [];
  // A whole identifier must win over a color name or number inside it.
  const pattern =
    /(?:[#$]{1,2}[\w-]*(?:\.[\w$.-]*)?|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?(?:[a-z][a-z0-9]*|%)?|[a-z_][\w-]*|--[\w-]+)/iy;
  let i = 0;
  const skipQuote = () => {
    const quote = value[i++];
    while (i < value.length) {
      const ch = value[i++];
      if (ch === '\\') i++;
      else if (ch === quote) break;
    }
    i = Math.min(i, value.length);
  };
  while (i < value.length) {
    if (value[i] === '"' || value[i] === "'") {
      const start = i;
      skipQuote();
      opaque.push({ start, end: i });
      continue;
    }
    pattern.lastIndex = i;
    const match = pattern.exec(value);
    if (!match) {
      i++;
      continue;
    }
    const word = match[0];
    const offset = i;
    i += word.length;
    const paren = /^\s*\(/.exec(value.slice(i));
    if (word.toLowerCase() === 'url' && paren) {
      i += paren[0].length;
      while (i < value.length) {
        if (value[i] === '"' || value[i] === "'") skipQuote();
        else if (value[i] === '\\') i += 2;
        else if (value[i++] === ')') break;
      }
      i = Math.min(i, value.length);
      opaque.push({ start: offset, end: i });
      continue;
    }
    words.push({ value: word, offset, isFunction: paren !== null });
  }
  return { words, opaque };
}

/** Scan inside expressions while keeping strings, URLs, and identifiers opaque. */
export function scanValueWords(value: string): ValueWord[] {
  return scan(value).words;
}

/** Hide text that regex-based checks must not rewrite, preserving source offsets. */
export function maskValueLiterals(value: string): string {
  let result = '';
  let start = 0;
  for (const span of scan(value).opaque) {
    result +=
      value.slice(start, span.start) + ' '.repeat(span.end - span.start);
    start = span.end;
  }
  return result + value.slice(start);
}
