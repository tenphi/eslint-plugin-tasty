import { scanTokens, checkBracketBalance } from './utils.js';
import { BUILT_IN_UNITS, CSS_UNITS } from '../constants.js';

// ============================================================================
// Types
// ============================================================================

export type ValueToken =
  | { type: 'color-token'; name: string; opacity?: string; raw: string }
  | { type: 'color-ref'; name: string; raw: string }
  | { type: 'custom-prop'; name: string; raw: string }
  | { type: 'custom-prop-ref'; name: string; raw: string }
  | { type: 'custom-unit'; value: number; unit: string; raw: string }
  | { type: 'css-unit'; value: number; unit: string; raw: string }
  | { type: 'number'; value: number; raw: string }
  | { type: 'keyword'; value: string }
  | { type: 'css-function'; name: string; args: string; raw: string }
  | { type: 'string'; value: string; raw: string }
  | { type: 'important'; raw: string }
  | { type: 'group-expr'; inner: string; raw: string }
  | { type: 'unknown'; raw: string };

export interface ValueError {
  message: string;
  offset: number;
  length: number;
  raw?: string;
}

export interface ValuePart {
  tokens: ValueToken[];
}

export interface ValueGroup {
  parts: ValuePart[];
}

export interface ValueParseResult {
  groups: ValueGroup[];
  errors: ValueError[];
}

export interface ValueParserOptions {
  knownUnits?: Set<string> | string[];
  knownFuncs?: Set<string> | string[];
  skipUnitValidation?: boolean;
  skipFuncValidation?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const RE_UNIT_NUM = /^[+-]?(?:\d*\.\d+|\d+)([a-z][a-z0-9]*)$/;
const RE_NUMBER = /^[+-]?(?:\d*\.\d+|\d+)$/;
const RE_CSS_UNIT_NUM = /^[+-]?(?:\d*\.\d+|\d+)([a-z%]+)$/;

const COLOR_FUNCS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'device-cmyk',
  'gray',
  'color-mix',
  'color-contrast',
]);

const CSS_FUNCS = new Set([
  'calc',
  'calc-size',
  'min',
  'max',
  'clamp',
  'abs',
  'sign',
  'round',
  'mod',
  'rem',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'var',
  'env',
  'attr',
  'counter',
  'counters',
  'image-set',
  'cross-fade',
  'image',
  'paint',
  'element',
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
  'url',
  'fit-content',
  'minmax',
  'repeat',
  'cubic-bezier',
  'steps',
  'linear',
  'rotate',
  'scale',
  'translate',
  'skew',
  'matrix',
  'perspective',
  'rotate3d',
  'rotateX',
  'rotateY',
  'rotateZ',
  'scale3d',
  'scaleX',
  'scaleY',
  'scaleZ',
  'translate3d',
  'translateX',
  'translateY',
  'translateZ',
  'skewX',
  'skewY',
  'matrix3d',
  'blur',
  'brightness',
  'contrast',
  'drop-shadow',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
  'polygon',
  'circle',
  'ellipse',
  'inset',
  'path',
  'xywh',
  'rect',
  'ray',
  'light-dark',
  'anchor',
  'anchor-size',
  'scroll',
  'view',
  'symbols',
]);

const VALUE_KEYWORDS = new Set([
  'auto',
  'none',
  'normal',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'max-content',
  'min-content',
  'fit-content',
  'stretch',
  'transparent',
  'currentcolor',
  'currentColor',
  // display
  'block',
  'inline',
  'inline-block',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'contents',
  'table',
  'table-row',
  'table-cell',
  'list-item',
  'flow-root',
  // position
  'static',
  'relative',
  'absolute',
  'fixed',
  'sticky',
  // overflow
  'visible',
  'hidden',
  'scroll',
  'clip',
  'overlay',
  // flex/align
  'center',
  'start',
  'end',
  'flex-start',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
  'baseline',
  // flow
  'row',
  'column',
  'row-reverse',
  'column-reverse',
  'wrap',
  'nowrap',
  'dense',
  // border
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  // directional
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  // radius shapes
  'round',
  'ellipse',
  'leaf',
  'backleaf',
  // dimension modifiers
  'min',
  'max',
  // text
  'bold',
  'bolder',
  'lighter',
  'italic',
  'oblique',
  'uppercase',
  'lowercase',
  'capitalize',
  'line-through',
  'underline',
  'overline',
  'wavy',
  // cursor
  'pointer',
  'default',
  'text',
  'move',
  'grab',
  'grabbing',
  'not-allowed',
  'crosshair',
  'wait',
  'help',
  'col-resize',
  'row-resize',
  'n-resize',
  's-resize',
  'e-resize',
  'w-resize',
  'ne-resize',
  'nw-resize',
  'se-resize',
  'sw-resize',
  'ew-resize',
  'ns-resize',
  'zoom-in',
  'zoom-out',
  // misc
  'cover',
  'contain',
  'fill',
  'no-repeat',
  'repeat-x',
  'repeat-y',
  'border-box',
  'padding-box',
  'content-box',
  'break-word',
  'break-all',
  'keep-all',
  'anywhere',
  'pre',
  'pre-wrap',
  'pre-line',
  'balance',
  'smooth',
  'horizontal',
  'vertical',
  'both',
  'mandatory',
  'proximity',
  // white-space
  'collapse',
  'preserve',
  'preserve-breaks',
  'break-spaces',
  // text-wrap
  'pretty',
  'stable',
  // will-change
  'transform',
  'opacity',
  // animation
  'infinite',
  'alternate',
  'alternate-reverse',
  'reverse',
  'forwards',
  'backwards',
  'running',
  'paused',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  // scrollbar
  'thin',
  'always',
  'both-edges',
  // width/height
  'fixed',
  // shadow
  'inset',
  // textOverflow
  'clip',
  // other
  'ltr',
  'rtl',
  'embed',
  'isolate',
  'isolate-override',
  'plaintext',
  'horizontal-tb',
  'vertical-rl',
  'vertical-lr',
  'sideways-rl',
  'sideways-lr',
  'monospace',
  'serif',
  'sans-serif',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'to',
  // misc
  'strong',
  'tight',
  'icon',
]);

// ============================================================================
// Classifier
// ============================================================================

function toSet(input?: Set<string> | string[]): Set<string> {
  if (!input) return new Set();
  return input instanceof Set ? input : new Set(input);
}

function classifyToken(
  raw: string,
  offset: number,
  errors: ValueError[],
  opts: ValueParserOptions,
): ValueToken {
  const token = raw.trim();
  if (!token) return { type: 'keyword', value: '' };

  // Quoted strings
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    return { type: 'string', value: token.slice(1, -1), raw: token };
  }

  // !important
  if (token === '!important') {
    return { type: 'important', raw: token };
  }

  // Double prefix: $$name (custom property reference for transitions)
  if (token.startsWith('$$')) {
    const name = token.slice(2);
    if (/^[a-z_][a-z0-9-_]*$/i.test(name)) {
      return { type: 'custom-prop-ref', name, raw: token };
    }
    errors.push({
      message: `Invalid custom property reference '${token}'.`,
      offset,
      length: token.length,
      raw: token,
    });
    return { type: 'unknown', raw: token };
  }

  // Double prefix: ##name (color reference for transitions)
  if (token.startsWith('##')) {
    const name = token.slice(2);
    if (/^[a-z_][a-z0-9-_]*$/i.test(name)) {
      return { type: 'color-ref', name, raw: token };
    }
    errors.push({
      message: `Invalid color reference '${token}'.`,
      offset,
      length: token.length,
      raw: token,
    });
    return { type: 'unknown', raw: token };
  }

  // Custom property: $name
  if (token.startsWith('$')) {
    const name = token.slice(1);
    if (/^[a-z_][a-z0-9-_]*$/i.test(name)) {
      return { type: 'custom-prop', name, raw: token };
    }
    errors.push({
      message: `Invalid custom property syntax '${token}'.`,
      offset,
      length: token.length,
      raw: token,
    });
    return { type: 'unknown', raw: token };
  }

  // Color token: #name, #name.N, #name.$prop, or bare # (error)
  if (token.startsWith('#')) {
    if (token.length === 1) {
      errors.push({
        message: 'Empty color token name.',
        offset,
        length: 1,
        raw: token,
      });
      return { type: 'unknown', raw: token };
    }
    return classifyColorToken(token, offset, errors);
  }

  // Parenthesized expression: (expr) — fallback, auto-calc, etc.
  if (token.startsWith('(') && token.endsWith(')')) {
    return { type: 'group-expr', inner: token.slice(1, -1), raw: token };
  }

  // Function call: name(...)
  const openIdx = token.indexOf('(');
  if (openIdx > 0 && token.endsWith(')')) {
    const fname = token.slice(0, openIdx);
    const args = token.slice(openIdx + 1, -1);

    if (opts.skipFuncValidation) {
      return { type: 'css-function', name: fname, args, raw: token };
    }

    const knownFuncs = toSet(opts.knownFuncs);

    if (
      COLOR_FUNCS.has(fname) ||
      CSS_FUNCS.has(fname) ||
      knownFuncs.has(fname)
    ) {
      return { type: 'css-function', name: fname, args, raw: token };
    }

    // Unknown function — still return as css-function but flag it
    errors.push({
      message: `Unknown function '${fname}()'.`,
      offset,
      length: token.length,
      raw: token,
    });
    return { type: 'css-function', name: fname, args, raw: token };
  }

  // Unit number: 2x, 1.5r, 10px, 50%, 1fr
  const unitMatch = token.match(RE_UNIT_NUM);
  if (unitMatch) {
    const unit = unitMatch[1];
    const numVal = parseFloat(token.slice(0, -unit.length));

    if (opts.skipUnitValidation) {
      return { type: 'custom-unit', value: numVal, unit, raw: token };
    }

    const knownUnits = toSet(opts.knownUnits);

    if (BUILT_IN_UNITS.has(unit) || knownUnits.has(unit)) {
      return { type: 'custom-unit', value: numVal, unit, raw: token };
    }
    if (CSS_UNITS.has(unit)) {
      return { type: 'css-unit', value: numVal, unit, raw: token };
    }

    errors.push({
      message: `Unknown unit '${unit}' in '${token}'.`,
      offset,
      length: token.length,
      raw: token,
    });
    return { type: 'unknown', raw: token };
  }

  // CSS unit with % (RE_UNIT_NUM doesn't match % since it expects alpha)
  const cssUnitMatch = token.match(RE_CSS_UNIT_NUM);
  if (cssUnitMatch) {
    const unit = cssUnitMatch[1];
    const numVal = parseFloat(token.slice(0, -unit.length));
    if (CSS_UNITS.has(unit)) {
      return { type: 'css-unit', value: numVal, unit, raw: token };
    }
  }

  // Plain number
  if (RE_NUMBER.test(token)) {
    return { type: 'number', value: parseFloat(token), raw: token };
  }

  // Tasty merge directive (@inherit)
  if (token === '@inherit') {
    return { type: 'keyword', value: token };
  }

  // Known keyword
  if (VALUE_KEYWORDS.has(token) || VALUE_KEYWORDS.has(token.toLowerCase())) {
    return { type: 'keyword', value: token };
  }

  // CSS custom property function var(--name)
  if (token.startsWith('var(') && token.endsWith(')')) {
    return {
      type: 'css-function',
      name: 'var',
      args: token.slice(4, -1),
      raw: token,
    };
  }

  // Unknown token
  return { type: 'unknown', raw: token };
}

function classifyColorToken(
  token: string,
  offset: number,
  errors: ValueError[],
): ValueToken {
  const raw = token;

  // Strip leading #
  const name = token.slice(1);

  if (name.length === 0) {
    errors.push({
      message: 'Empty color token name.',
      offset,
      length: token.length,
      raw,
    });
    return { type: 'unknown', raw };
  }

  // Check for opacity suffix
  const dotIndex = name.indexOf('.');
  if (dotIndex !== -1) {
    const tokenName = name.slice(0, dotIndex);
    const opacitySuffix = name.slice(dotIndex + 1);

    if (tokenName.length === 0) {
      errors.push({
        message: 'Empty color token name before opacity.',
        offset,
        length: token.length,
        raw,
      });
      return { type: 'unknown', raw };
    }

    // Dynamic opacity from CSS custom property
    if (opacitySuffix.startsWith('$')) {
      return {
        type: 'color-token',
        name: tokenName,
        opacity: opacitySuffix,
        raw,
      };
    }

    if (opacitySuffix.length === 0) {
      errors.push({
        message: 'Trailing dot with no opacity value.',
        offset,
        length: token.length,
        raw,
      });
      return { type: 'unknown', raw };
    }

    const opacity = Number(opacitySuffix);
    if (isNaN(opacity)) {
      errors.push({
        message: `Invalid opacity value '${opacitySuffix}'.`,
        offset,
        length: token.length,
        raw,
      });
      return { type: 'unknown', raw };
    }
    if (opacity < 0) {
      errors.push({
        message: 'Opacity cannot be negative.',
        offset,
        length: token.length,
        raw,
      });
      return { type: 'unknown', raw };
    }
    if (opacity > 100) {
      errors.push({
        message: `Opacity '${opacitySuffix}' exceeds 100.`,
        offset,
        length: token.length,
        raw,
      });
      return { type: 'unknown', raw };
    }

    return {
      type: 'color-token',
      name: tokenName,
      opacity: opacitySuffix,
      raw,
    };
  }

  return { type: 'color-token', name, raw };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a style value string into typed tokens organized by
 * comma-separated groups and slash-separated parts.
 */
export function parseValue(
  src: string,
  opts: ValueParserOptions = {},
): ValueParseResult {
  const errors: ValueError[] = [];

  // Check bracket balance first
  const bracketError = checkBracketBalance(src);
  if (bracketError) {
    errors.push({
      message: bracketError.message,
      offset: bracketError.position,
      length: 1,
    });
    return { groups: [], errors };
  }

  const scanned = scanTokens(src);

  const groups: ValueGroup[] = [];
  let currentParts: ValuePart[] = [];
  let currentTokens: ValueToken[] = [];

  const endPart = () => {
    if (currentTokens.length > 0) {
      currentParts.push({ tokens: currentTokens });
      currentTokens = [];
    }
  };

  const endGroup = () => {
    endPart();
    if (currentParts.length > 0) {
      groups.push({ parts: currentParts });
    } else {
      groups.push({ parts: [{ tokens: [] }] });
    }
    currentParts = [];
  };

  for (const scanned_token of scanned) {
    if (scanned_token.value) {
      const classified = classifyToken(
        scanned_token.value,
        scanned_token.offset,
        errors,
        opts,
      );
      currentTokens.push(classified);
    }
    if (scanned_token.isSlash) endPart();
    if (scanned_token.isComma) endGroup();
  }

  // Push final group
  if (
    currentTokens.length > 0 ||
    currentParts.length > 0 ||
    groups.length === 0
  ) {
    endGroup();
  }

  return { groups, errors };
}

/**
 * Extract all tokens of a specific type from a parse result.
 */
export function extractTokensByType<T extends ValueToken['type']>(
  result: ValueParseResult,
  type: T,
): Extract<ValueToken, { type: T }>[] {
  const tokens: Extract<ValueToken, { type: T }>[] = [];
  for (const group of result.groups) {
    for (const part of group.parts) {
      for (const token of part.tokens) {
        if (token.type === type) {
          tokens.push(token as Extract<ValueToken, { type: T }>);
        }
      }
    }
  }
  return tokens;
}

/**
 * Get a flat list of all tokens from a parse result.
 */
export function flattenTokens(result: ValueParseResult): ValueToken[] {
  const tokens: ValueToken[] = [];
  for (const group of result.groups) {
    for (const part of group.parts) {
      tokens.push(...part.tokens);
    }
  }
  return tokens;
}
