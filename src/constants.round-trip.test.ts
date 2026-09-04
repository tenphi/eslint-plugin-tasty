import { renderStyles } from '@tenphi/tasty';

import {
  COLOR_BEARING_PROPERTIES,
  KNOWN_CSS_PROPERTIES,
  KNOWN_TASTY_PROPERTIES,
  PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION,
  PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION,
  SHORTHAND_MAPPING,
} from './constants.js';

/**
 * The sync guard for the two expansion-exception lists.
 *
 * `prefer-custom-property-syntax` suppresses a rewrite when the property does not
 * expand the token form it would produce. Those lists are exceptions to tasty's
 * general behaviour, so they can only be right if they are derived from tasty
 * itself — a hand-maintained copy drifts the moment a style handler changes, and
 * the failure mode is an autofix that deletes a declaration with no error.
 *
 * This re-derives both lists against the installed `@tenphi/tasty` and fails on any
 * drift. If it fails after a tasty upgrade, paste the printed sets into
 * `constants.ts` — do not edit them by hand.
 */

const ALL_PROPERTIES = [
  ...new Set([...KNOWN_TASTY_PROPERTIES, ...KNOWN_CSS_PROPERTIES]),
].sort();

/** Render a single declaration, or null when the property throws or emits nothing. */
function render(property: string, value: string): string | null {
  try {
    const out = renderStyles({ [property]: value })
      .rules.map((rule) => rule.declarations)
      .join('');

    return out || null;
  } catch {
    return null;
  }
}

/**
 * A property "swallows" a token when the rendered CSS still contains the literal
 * `$name` / `#name`, meaning tasty passed it through instead of expanding it. That
 * is an invalid declaration, so any rewrite producing that form is unsafe.
 */
function propertiesSwallowing(token: string): string[] {
  return ALL_PROPERTIES.filter((property) => {
    const out = render(property, token);

    return out !== null && out.includes(token);
  });
}

describe('token expansion exceptions', () => {
  it('matches the properties that swallow a $name custom property', () => {
    expect(propertiesSwallowing('$test-token')).toEqual(
      [...PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION].sort(),
    );
  });

  it('matches the properties that swallow a #name color token', () => {
    expect(propertiesSwallowing('#test-token')).toEqual(
      [...PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION].sort(),
    );
  });

  it('keeps the two lists distinct', () => {
    // Not a style rule — a guard against someone "simplifying" them into one
    // set. They answer different questions, and the answers no longer even have
    // the same shape: since tasty 3.0.2 every property expands `$name`, while
    // `#token` expansion is still property-scoped. Merging them would make the
    // empty list swallow the populated one and allow broken `#token` rewrites.
    const propOnly = [...PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION].filter(
      (property) => !PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION.has(property),
    );

    expect(PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION.size).toBe(0);
    expect(propOnly).toContain('fontSize');
  });

  it('confirms tasty substitutes $name in pass-through values', () => {
    // Each of these was produced by --fix in a real codebase and silently
    // dropped, which is why the suppression list existed. tasty 3.0.2 fixed the
    // handlers (tasty#264), so the same rewrites are now correct — these assert
    // the fix rather than the breakage.
    expect(render('fontFamily', '$font-sans')).toBe(
      'font-family: var(--font-sans);',
    );
    expect(render('fill', '$purple-color-rgb')).toBe(
      'background-color: var(--purple-color-rgb);',
    );
    expect(render('color', '$cui-text-color-secondary')).toContain(
      'color: var(--cui-text-color-secondary);',
    );
  });

  it('still passes a #name colour token through a dimension property', () => {
    // The other list is not vestigial: this is the rewrite it suppresses.
    expect(render('fontSize', '#test-token')).toBe('font-size: #test-token;');
  });
});

/**
 * The sync guard for `prefer-shorthand-property`'s auto-fixable renames.
 *
 * `safeFix` claims a rename is a pure key edit — that the native property and the
 * Tasty one emit the same CSS for the same value, so `eslint --fix` can apply it
 * unattended. That claim is about the *runtime*, not about this repo, so it can
 * only be checked against the runtime. A handler that starts adding a default
 * (the way `blockBorder` fills in style and colour, which is exactly why
 * `borderBlock` is not auto-fixable) would otherwise turn a green test suite into
 * an autofix that changes what the browser renders.
 */
const DIMENSION_VALUES = ['1x', '1x 2x', '0', 'auto', '10px', '50%', 'inherit'];

/**
 * Colours are checked only against a rename whose target actually takes one.
 *
 * Feeding `#purple` to a spacing property is not a shared no-op: the enhanced
 * axis handlers bucket colours separately from values, so `blockPadding:
 * '#purple'` finds no value and falls back to `0` while the native
 * `padding-block` passes the colour straight through. Both are garbage in, but
 * not the *same* garbage — and asserting on that would be testing the parser's
 * bucketing, not whether the rename is safe.
 */
const COLOR_VALUES = ['#purple', 'red'];

describe('auto-fixable shorthand renames', () => {
  const safeFixRenames = Object.entries(SHORTHAND_MAPPING).filter(
    ([, mapping]) => mapping.safeFix,
  );

  it('has renames to check', () => {
    // Guards against the filter silently matching nothing.
    expect(safeFixRenames.length).toBeGreaterThan(10);
  });

  it.each(safeFixRenames)('%s emits identical CSS', (native, mapping) => {
    const values = COLOR_BEARING_PROPERTIES.has(mapping.property)
      ? [...DIMENSION_VALUES, ...COLOR_VALUES]
      : DIMENSION_VALUES;

    for (const value of values) {
      expect(render(mapping.property, value), `${native}: '${value}'`).toBe(
        render(native, value),
      );
    }
  });
});
