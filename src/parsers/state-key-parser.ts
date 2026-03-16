import { BUILT_IN_STATE_PREFIXES, KNOWN_PSEUDO_CLASSES } from '../constants.js';

// ============================================================================
// Types
// ============================================================================

export interface StateKeyError {
  message: string;
  offset: number;
  length: number;
}

export interface StateKeyResult {
  errors: StateKeyError[];
  hasOwn: boolean;
  referencedAliases: string[];
}

export interface StateKeyParserOptions {
  knownAliases?: string[];
}

// ============================================================================
// Tokenizer
// ============================================================================

type TokenType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'LPAREN' | 'RPAREN' | 'STATE';

interface Token {
  type: TokenType;
  value: string;
  offset: number;
  length: number;
}

/**
 * Pattern for tokenizing state notation.
 * Matches operators, parentheses, @-prefixed states, value mods, boolean mods,
 * pseudo-classes with functions (including :is/:has/:not/:where with nesting),
 * class selectors, and attribute selectors.
 */
const STATE_TOKEN_PATTERN =
  /([&|!^])|([()])|(@media:[a-z]+)|(@media\([^)]*\))|(@supports\([^()]*(?:\([^)]*\))?[^)]*\))|(@root\([^)]*\))|(@parent\([^)]*\))|(@own\([^)]*\))|(@\([^()]*(?:\([^)]*\))?[^)]*\))|(@starting)|(@[A-Za-z][A-Za-z0-9-]*)|([a-z][a-z0-9-]*(?:\^=|\$=|\*=|=)(?:"[^"]*"|'[^']*'|[^\s&|!^()]+))|([a-z][a-z0-9-]+)|(:(?:is|has|not|where)\([^()]*(?:\([^()]*(?:\([^)]*\))?[^)]*\))*[^)]*\))|(:[-a-z][a-z0-9-]*(?:\([^)]+\))?)|(\.[a-z][a-z0-9-]+)|(\[[^\]]+\])/gi;

function tokenize(stateKey: string): {
  tokens: Token[];
  errors: StateKeyError[];
} {
  const tokens: Token[] = [];
  const errors: StateKeyError[] = [];

  // Replace commas with | outside of parentheses
  const normalized = replaceCommasOutsideParens(stateKey);

  const covered = new Set<number>();

  STATE_TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STATE_TOKEN_PATTERN.exec(normalized)) !== null) {
    const fullMatch = match[0];
    const offset = match.index;

    for (let i = offset; i < offset + fullMatch.length; i++) {
      covered.add(i);
    }

    if (match[1]) {
      switch (fullMatch) {
        case '&':
          tokens.push({ type: 'AND', value: '&', offset, length: 1 });
          break;
        case '|':
          tokens.push({ type: 'OR', value: '|', offset, length: 1 });
          break;
        case '!':
          tokens.push({ type: 'NOT', value: '!', offset, length: 1 });
          break;
        case '^':
          tokens.push({ type: 'XOR', value: '^', offset, length: 1 });
          break;
      }
    } else if (match[2]) {
      if (fullMatch === '(') {
        tokens.push({ type: 'LPAREN', value: '(', offset, length: 1 });
      } else {
        tokens.push({ type: 'RPAREN', value: ')', offset, length: 1 });
      }
    } else {
      tokens.push({
        type: 'STATE',
        value: fullMatch,
        offset,
        length: fullMatch.length,
      });
    }
  }

  // Check for uncovered characters (unrecognized tokens)
  const uncovered: { ch: string; pos: number }[] = [];
  for (let i = 0; i < stateKey.length; i++) {
    const ch = stateKey[i];
    if (ch === ' ' || ch === '\t' || ch === ',') continue;
    if (!covered.has(i)) {
      uncovered.push({ ch, pos: i });
    }
  }

  if (uncovered.length > 0) {
    const chars = [...new Set(uncovered.map((u) => u.ch))].join('');
    errors.push({
      message: `Unrecognized characters '${chars}' in state key '${stateKey}'.`,
      offset: uncovered[0].pos,
      length: 1,
    });
  }

  return { tokens, errors };
}

function replaceCommasOutsideParens(str: string): string {
  let result = '';
  let depth = 0;

  for (const char of str) {
    if (char === '(') {
      depth++;
      result += char;
    } else if (char === ')') {
      depth--;
      result += char;
    } else if (char === ',' && depth === 0) {
      result += '|';
    } else {
      result += char;
    }
  }

  return result;
}

// ============================================================================
// Validator
// ============================================================================

const MAX_XOR_CHAIN_LENGTH = 4;

const DIMENSION_SHORTHANDS = new Set(['w', 'h', 'is', 'bs']);
const DIMENSION_FULL = new Set([
  'width',
  'height',
  'inline-size',
  'block-size',
]);

class StateKeyValidator {
  private errors: StateKeyError[] = [];
  private hasOwn = false;
  private referencedAliases: string[] = [];
  private tokens: Token[];
  private pos = 0;
  private opts: StateKeyParserOptions;
  private insideOwn = false;

  constructor(
    tokens: Token[],
    tokenErrors: StateKeyError[],
    opts: StateKeyParserOptions,
  ) {
    this.tokens = tokens;
    this.errors = [...tokenErrors];
    this.opts = opts;
  }

  validate(): StateKeyResult {
    if (this.tokens.length > 0) {
      this.parseExpression();
    }

    return {
      errors: this.errors,
      hasOwn: this.hasOwn,
      referencedAliases: this.referencedAliases,
    };
  }

  private current(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private match(type: TokenType): boolean {
    if (this.current()?.type === type) {
      this.advance();
      return true;
    }
    return false;
  }

  private parseExpression(): void {
    this.parseAnd();
  }

  private parseAnd(): void {
    this.parseOr();
    while (this.current()?.type === 'AND') {
      this.advance();
      if (!this.current() || this.current()?.type === 'AND') {
        const prev = this.tokens[this.pos - 1];
        this.errors.push({
          message: "Expected expression after '&' operator.",
          offset: prev.offset,
          length: prev.length,
        });
        return;
      }
      this.parseOr();
    }
  }

  private parseOr(): void {
    this.parseXor();
    while (this.current()?.type === 'OR') {
      this.advance();
      if (!this.current() || this.current()?.type === 'OR') {
        const prev = this.tokens[this.pos - 1];
        this.errors.push({
          message: "Expected expression after '|' operator.",
          offset: prev.offset,
          length: prev.length,
        });
        return;
      }
      this.parseXor();
    }
  }

  private parseXor(): void {
    this.parseUnary();
    let operandCount = 1;

    while (this.current()?.type === 'XOR') {
      this.advance();
      operandCount++;
      if (operandCount > MAX_XOR_CHAIN_LENGTH) {
        const prev = this.tokens[this.pos - 1];
        this.errors.push({
          message: `XOR chain with ${operandCount} operands produces ${Math.pow(2, operandCount - 1)} OR branches. Consider breaking into smaller expressions.`,
          offset: prev.offset,
          length: prev.length,
        });
      }
      this.parseUnary();
    }
  }

  private parseUnary(): void {
    if (this.match('NOT')) {
      if (
        !this.current() ||
        this.current()?.type === 'AND' ||
        this.current()?.type === 'OR' ||
        this.current()?.type === 'XOR'
      ) {
        const prev = this.tokens[this.pos - 1];
        this.errors.push({
          message: "Expected expression after '!' operator.",
          offset: prev.offset,
          length: prev.length,
        });
        return;
      }
      this.parseUnary();
      return;
    }
    this.parsePrimary();
  }

  private parsePrimary(): void {
    if (this.match('LPAREN')) {
      this.parseExpression();
      if (!this.match('RPAREN')) {
        this.errors.push({
          message: "Missing closing ')' in state expression.",
          offset: this.tokens[this.pos - 1]?.offset ?? 0,
          length: 1,
        });
      }
      return;
    }

    const token = this.current();
    if (token?.type === 'STATE') {
      this.advance();
      this.validateStateToken(token);
      return;
    }

    // Unexpected token or end
    if (token) {
      this.errors.push({
        message: `Unexpected token '${token.value}'.`,
        offset: token.offset,
        length: token.length,
      });
      this.advance();
    }
  }

  private validateStateToken(token: Token): void {
    const value = token.value;

    // @starting
    if (value === '@starting') return;

    // @media:type
    if (value.startsWith('@media:')) {
      const mediaType = value.slice(7);
      const validTypes = new Set(['print', 'screen', 'all', 'speech']);
      if (!validTypes.has(mediaType)) {
        this.errors.push({
          message: `Unknown media type '${mediaType}'. Valid: print, screen, all, speech.`,
          offset: token.offset,
          length: token.length,
        });
      }
      return;
    }

    // @media(...)
    if (value.startsWith('@media(')) {
      this.validateMediaQuery(value, token);
      return;
    }

    // @supports(...)
    if (value.startsWith('@supports(')) {
      this.validateSupportsQuery(value, token);
      return;
    }

    // @root(...)
    if (value.startsWith('@root(')) {
      this.validateInnerStateExpression(value, 6, token);
      return;
    }

    // @parent(...)
    if (value.startsWith('@parent(')) {
      this.validateParentState(value, token);
      return;
    }

    // @own(...)
    if (value.startsWith('@own(')) {
      this.hasOwn = true;
      if (this.insideOwn) {
        this.errors.push({
          message: 'Nested @own() is not allowed.',
          offset: token.offset,
          length: token.length,
        });
        return;
      }
      const prevInsideOwn = this.insideOwn;
      this.insideOwn = true;
      this.validateInnerStateExpression(value, 5, token);
      this.insideOwn = prevInsideOwn;
      return;
    }

    // @(...) container query
    if (value.startsWith('@(')) {
      this.validateContainerQuery(value, token);
      return;
    }

    // @alias predefined state
    if (value.startsWith('@') && /^@[A-Za-z][A-Za-z0-9-]*$/.test(value)) {
      this.referencedAliases.push(value);
      return;
    }

    // Pseudo-class/pseudo-element
    if (value.startsWith(':')) {
      this.validatePseudoClass(value, token);
      return;
    }

    // Class selector
    if (value.startsWith('.')) return;

    // Attribute selector
    if (value.startsWith('[')) {
      this.validateAttributeSelector(value, token);
      return;
    }

    // Value modifier (e.g., theme=danger)
    if (value.includes('=')) {
      this.validateValueModifier(value, token);
      return;
    }

    // Boolean modifier (e.g., hovered, disabled)
    if (/^[a-z][a-z0-9-]+$/i.test(value)) return;

    this.errors.push({
      message: `Unrecognized state token '${value}'.`,
      offset: token.offset,
      length: token.length,
    });
  }

  private validateMediaQuery(raw: string, token: Token): void {
    const content = raw.slice(7, -1);
    if (!content.trim()) {
      this.errors.push({
        message: 'Empty @media() query.',
        offset: token.offset,
        length: token.length,
      });
      return;
    }

    // Expand dimension shorthands for validation
    const expanded = expandDimensionShorthands(content.trim());

    // Feature query (contains ':' but no comparison operators)
    if (
      expanded.includes(':') &&
      !expanded.includes('<') &&
      !expanded.includes('>') &&
      !expanded.includes('=')
    ) {
      return;
    }

    // Boolean feature query (no comparison operators)
    if (
      !expanded.includes('<') &&
      !expanded.includes('>') &&
      !expanded.includes('=')
    ) {
      return;
    }

    // Dimension query — validate dimension names
    this.validateDimensionCondition(expanded, token);
  }

  private validateDimensionCondition(condition: string, token: Token): void {
    // Range syntax: 600px <= width < 1200px
    const rangeMatch = condition.match(
      /^(.+?)\s*(<=|<)\s*(\S+)\s*(<=|<)\s*(.+)$/,
    );
    if (rangeMatch) {
      const dim = rangeMatch[3];
      if (!DIMENSION_FULL.has(dim) && !DIMENSION_SHORTHANDS.has(dim)) {
        this.errors.push({
          message: `Unknown dimension '${dim}' in media/container query. Valid: width, height, inline-size, block-size (or w, h, is, bs).`,
          offset: token.offset,
          length: token.length,
        });
      }
      return;
    }

    // Simple comparison: width < 768px
    const simpleMatch = condition.match(/^(\S+)\s*(<=|>=|<|>|=)\s*(.+)$/);
    if (simpleMatch) {
      const dim = simpleMatch[1];
      if (DIMENSION_FULL.has(dim) || DIMENSION_SHORTHANDS.has(dim)) {
        return;
      }
    }

    // Reversed: 768px > width
    const reversedMatch = condition.match(/^(.+?)\s*(<=|>=|<|>|=)\s*(\S+)$/);
    if (reversedMatch) {
      const dim = reversedMatch[3];
      if (DIMENSION_FULL.has(dim) || DIMENSION_SHORTHANDS.has(dim)) {
        return;
      }
    }
  }

  private validateSupportsQuery(raw: string, token: Token): void {
    const content = raw.slice(10, -1);
    if (!content.trim()) {
      this.errors.push({
        message: 'Empty @supports() query.',
        offset: token.offset,
        length: token.length,
      });
    }
  }

  private validateInnerStateExpression(
    raw: string,
    prefixLen: number,
    _token: Token,
  ): void {
    const content = raw.slice(prefixLen, -1);
    if (!content.trim()) return;

    const innerResult = parseStateKey(content, this.opts);
    this.errors.push(...innerResult.errors);
    if (innerResult.hasOwn) this.hasOwn = true;
    this.referencedAliases.push(...innerResult.referencedAliases);
  }

  private validateParentState(raw: string, token: Token): void {
    const content = raw.slice(8, -1);
    if (!content.trim()) {
      this.errors.push({
        message: 'Empty @parent() state.',
        offset: token.offset,
        length: token.length,
      });
      return;
    }

    let condition = content.trim();

    // Check for direct parent combinator: @parent(hovered, >)
    const lastCommaIdx = condition.lastIndexOf(',');
    if (lastCommaIdx !== -1) {
      const afterComma = condition.slice(lastCommaIdx + 1).trim();
      if (afterComma === '>') {
        condition = condition.slice(0, lastCommaIdx).trim();
      }
    }

    const innerResult = parseStateKey(condition, this.opts);
    this.errors.push(...innerResult.errors);
    this.referencedAliases.push(...innerResult.referencedAliases);
  }

  private validateContainerQuery(raw: string, token: Token): void {
    const content = raw.slice(2, -1);
    if (!content.trim()) {
      this.errors.push({
        message: 'Empty container query.',
        offset: token.offset,
        length: token.length,
      });
      return;
    }

    // Named container: @(layout, w < 600px)
    const commaIdx = findTopLevelComma(content);
    let condition: string;

    if (commaIdx !== -1) {
      condition = content.slice(commaIdx + 1).trim();
    } else {
      condition = content.trim();
    }

    // Style query: @($variant=primary) — skip
    if (condition.startsWith('$')) return;

    // Function-like: scroll-state(...) — skip
    if (/^[a-zA-Z][\w-]*\s*\(/.test(condition)) return;

    // Dimension query
    const expanded = expandDimensionShorthands(condition);
    if (
      expanded.includes('<') ||
      expanded.includes('>') ||
      expanded.includes('=')
    ) {
      this.validateDimensionCondition(expanded, token);
    }
  }

  private validatePseudoClass(value: string, token: Token): void {
    // :is(), :has(), :not(), :where() — structural pseudo-classes
    const enhancedMatch = /^:(is|has|not|where)\(/.exec(value);
    if (enhancedMatch) return;

    // Functional pseudo-classes like :nth-child(2n+1)
    const funcMatch = /^(:[a-z-]+)\(/.exec(value);
    if (funcMatch) {
      const baseName = funcMatch[1];
      if (!KNOWN_PSEUDO_CLASSES.has(baseName)) {
        this.errors.push({
          message: `Unknown pseudo-class '${baseName}'.`,
          offset: token.offset,
          length: token.length,
        });
      }
      return;
    }

    // Simple pseudo-class: :hover, :focus, etc.
    if (!KNOWN_PSEUDO_CLASSES.has(value)) {
      this.errors.push({
        message: `Unknown pseudo-class '${value}'.`,
        offset: token.offset,
        length: token.length,
      });
    }
  }

  private validateAttributeSelector(value: string, token: Token): void {
    if (!value.startsWith('[') || !value.endsWith(']')) {
      this.errors.push({
        message: `Malformed attribute selector '${value}'.`,
        offset: token.offset,
        length: token.length,
      });
    }
  }

  private validateValueModifier(value: string, token: Token): void {
    const opMatch = value.match(/^([a-z][a-z0-9-]*)(\^=|\$=|\*=|=)(.+)$/i);
    if (!opMatch) {
      this.errors.push({
        message: `Invalid value modifier syntax '${value}'.`,
        offset: token.offset,
        length: token.length,
      });
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function expandDimensionShorthands(condition: string): string {
  return condition
    .replace(/\bw\b/g, 'width')
    .replace(/\bh\b/g, 'height')
    .replace(/\bis\b/g, 'inline-size')
    .replace(/\bbs\b/g, 'block-size');
}

function findTopLevelComma(str: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) return i;
  }
  return -1;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate a state key string and return detailed errors.
 */
export function parseStateKey(
  stateKey: string,
  opts: StateKeyParserOptions = {},
): StateKeyResult {
  if (!stateKey || !stateKey.trim()) {
    return { errors: [], hasOwn: false, referencedAliases: [] };
  }

  const { tokens, errors: tokenErrors } = tokenize(stateKey.trim());
  const validator = new StateKeyValidator(tokens, tokenErrors, opts);
  return validator.validate();
}

/**
 * Validate a state definition value (the RHS of a state alias).
 * State definitions should be valid state expressions like
 * '@media(w < 768px)', '@root(theme=dark)', etc.
 */
export function validateStateDefinition(
  value: string,
  opts: StateKeyParserOptions = {},
): StateKeyResult {
  return parseStateKey(value, opts);
}
