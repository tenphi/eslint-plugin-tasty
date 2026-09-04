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
