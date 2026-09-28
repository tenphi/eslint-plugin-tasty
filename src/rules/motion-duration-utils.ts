/** Numeric CSS time values. A zero duration intentionally disables motion. */
const TIME_LITERAL = /^(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)$/i;
const TIME_IN_EXPRESSION =
  /(?:^|[^\w.])((?:\d+(?:\.\d+)?|\.\d+)(?:ms|s))(?![\w-])/gi;
const TIME_EXPRESSION = /^(?:\(|calc\(|min\(|max\(|clamp\()/i;
const DURATION_TOKEN = /(?:^\$transition$|-transition$|duration)/i;

export function isTimeLiteral(value: string): boolean {
  return TIME_LITERAL.test(value);
}

export function isZeroTime(value: string): boolean {
  return (
    value === '0' || (isTimeLiteral(value) && Number.parseFloat(value) === 0)
  );
}

export function isNonzeroTime(value: string): boolean {
  return isTimeLiteral(value) && Number.parseFloat(value) !== 0;
}

export function hasRawTimeInExpression(value: string): boolean {
  // A variable-based expression already derives its timing from a token.
  if (!isTimeExpression(value) || /\$|\bvar\(/i.test(value)) return false;

  for (const match of value.matchAll(TIME_IN_EXPRESSION)) {
    if (Number.parseFloat(match[1]) !== 0) return true;
  }
  return false;
}

export function isTimeExpression(value: string): boolean {
  return TIME_EXPRESSION.test(value);
}

export function getDurationTokens(
  tokens: false | string[] | undefined,
): string[] {
  return Array.isArray(tokens)
    ? tokens.filter(
        (token) => token.startsWith('$') && DURATION_TOKEN.test(token),
      )
    : [];
}
