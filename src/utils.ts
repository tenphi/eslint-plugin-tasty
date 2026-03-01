import type { TSESTree } from '@typescript-eslint/utils';
import {
  BUILT_IN_UNITS,
  CSS_UNITS,
  BUILT_IN_STATE_PREFIXES,
} from './constants.js';
import type { ResolvedConfig } from './types.js';

/**
 * Gets the string value of a property key node.
 */
export function getKeyName(key: TSESTree.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  if (key.type === 'Literal' && typeof key.value === 'number')
    return String(key.value);
  return null;
}

/**
 * Gets the string value of a node if it is a string literal.
 */
export function getStringValue(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}

/**
 * Checks if a value node is a static literal.
 */
export function isStaticValue(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return true;
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'Literal'
  ) {
    return true;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return true;
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.every((el) => el !== null && isStaticValue(el));
  }
  if (node.type === 'ObjectExpression') {
    return node.properties.every(
      (prop) =>
        prop.type === 'Property' && !prop.computed && isStaticValue(prop.value),
    );
  }
  return false;
}

/**
 * Validates color token syntax.
 * Returns null if valid, or an error message if invalid.
 */
export function validateColorTokenSyntax(token: string): string | null {
  // Strip leading # or ##
  let name = token;
  if (name.startsWith('##')) {
    name = name.slice(2);
  } else if (name.startsWith('#')) {
    name = name.slice(1);
  } else {
    return 'Color token must start with #';
  }

  if (name.length === 0) return 'Empty color token name';

  // Check for opacity suffix
  const dotIndex = name.indexOf('.');
  if (dotIndex !== -1) {
    const tokenName = name.slice(0, dotIndex);
    const opacitySuffix = name.slice(dotIndex + 1);

    if (tokenName.length === 0) return 'Empty color token name before opacity';

    if (opacitySuffix.startsWith('$')) {
      // Dynamic opacity from CSS custom property — always valid
      return null;
    }

    if (opacitySuffix.length === 0) return 'Trailing dot with no opacity value';

    const opacity = Number(opacitySuffix);
    if (isNaN(opacity)) return `Invalid opacity value '${opacitySuffix}'`;
    if (opacity < 0) return 'Opacity cannot be negative';
    if (opacity > 100) return `Opacity '${opacitySuffix}' exceeds 100`;
  }

  return null;
}

/**
 * Checks if a string looks like a raw hex color (not a token).
 * Hex colors: #fff, #ffff, #ffffff, #ffffffff (3, 4, 6, or 8 hex chars).
 */
export function isRawHexColor(value: string): boolean {
  if (!value.startsWith('#')) return false;
  const hex = value.slice(1).split('.')[0];
  if (![3, 4, 6, 8].includes(hex.length)) return false;
  return /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * Extracts custom unit from a value token like "2x", "1.5r", "3cols".
 * Returns the unit name, or null if not a custom-unit value.
 */
export function extractCustomUnit(token: string): string | null {
  const match = token.match(/^-?[\d.]+([a-zA-Z]+)$/);
  if (!match) return null;
  return match[1];
}

/**
 * Checks if a unit is valid (built-in, CSS, or in config).
 */
export function isValidUnit(unit: string, config: ResolvedConfig): boolean {
  if (config.units === false) return true;
  if (BUILT_IN_UNITS.has(unit)) return true;
  if (CSS_UNITS.has(unit)) return true;
  if (Array.isArray(config.units) && config.units.includes(unit)) return true;
  return false;
}

/**
 * Checks if a state alias key (starting with @) is known.
 */
export function isKnownStateAlias(
  key: string,
  config: ResolvedConfig,
): boolean {
  // Built-in prefixes
  for (const prefix of BUILT_IN_STATE_PREFIXES) {
    if (key === prefix || key.startsWith(prefix + '(')) return true;
  }
  // Container query shorthand
  if (key.startsWith('@(')) return true;
  // Config aliases
  return config.states.includes(key);
}

/**
 * Checks if a CSS selector string is basically valid.
 */
export function isValidSelector(selector: string): string | null {
  if (selector.length === 0) return 'Selector cannot be empty';

  // Check balanced brackets
  let depth = 0;
  for (const char of selector) {
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (depth < 0) return 'Unbalanced brackets in selector';
  }
  if (depth !== 0) return 'Unbalanced brackets in selector';

  return null;
}

/**
 * Finds a property by key name in an object expression.
 */
export function findProperty(
  obj: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Property | undefined {
  for (const prop of obj.properties) {
    if (prop.type === 'Property' && !prop.computed) {
      const keyName = getKeyName(prop.key);
      if (keyName === name) return prop;
    }
  }
  return undefined;
}
