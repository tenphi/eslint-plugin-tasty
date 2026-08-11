import { renderStyles } from '@tenphi/tasty';

import {
  KNOWN_CSS_PROPERTIES,
  KNOWN_TASTY_PROPERTIES,
  PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION,
  PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION,
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
    // Not a style rule — a guard against someone "simplifying" them into one set.
    // Colour properties expand `#token` but not `$name`; dimension properties do the
    // reverse. Merging them would suppress correct rewrites and allow broken ones.
    const colorOnly = [...PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION].filter(
      (property) => !PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION.has(property),
    );
    const propOnly = [...PROPERTIES_WITHOUT_COLOR_TOKEN_EXPANSION].filter(
      (property) => !PROPERTIES_WITHOUT_CUSTOM_PROPERTY_EXPANSION.has(property),
    );

    expect(colorOnly).toContain('fill');
    expect(propOnly).toContain('fontSize');
  });

  it('confirms the declarations this rule used to break', () => {
    // Each of these was produced by --fix in a real codebase and silently dropped.
    expect(render('fontFamily', '$font-sans')).toBe('font-family: $font-sans;');
    expect(render('fill', '$purple-color-rgb')).toBe(
      'background-color: $purple-color-rgb;',
    );
    expect(render('color', '$cui-text-color-secondary')).toBe(
      'color: $cui-text-color-secondary;',
    );
  });
});
