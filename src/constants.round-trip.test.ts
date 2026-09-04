import * as tasty from '@tenphi/tasty';
import { renderStyles } from '@tenphi/tasty';

import {
  BOOLEAN_TRUE_PROPERTIES,
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

/**
 * The sync guard for the property list itself.
 *
 * Tasty exports its public style lists (`CONTAINER_STYLES`, `FLOW_STYLES`, …),
 * which is the documented user-facing surface. Every name in them has to be a
 * property this plugin recognises, or `known-property` reports valid code — the
 * failure mode that made this guard worth writing: `place` shipped in
 * `FLOW_STYLES` and `CONTAINER_STYLES` and was reported as unknown, because it
 * is a Tasty style with no CSS property of the same name to fall back on.
 *
 * Deliberately reads the exported lists rather than the `STYLE_TO_CHUNK`
 * registry. That registry also carries chunk-routing entries with no user-facing
 * handler — `boldFontWeight` renders `bold-font-weight: 700`, the same dead
 * passthrough any unknown camelCase key gets — and adding those would suppress a
 * correct report.
 */
const PUBLIC_STYLE_LISTS = [
  'BASE_STYLES',
  'COLOR_STYLES',
  'TEXT_STYLES',
  'DIMENSION_STYLES',
  'POSITION_STYLES',
  'BLOCK_STYLES',
  'BLOCK_INNER_STYLES',
  'BLOCK_OUTER_STYLES',
  'FLOW_STYLES',
  'CONTAINER_STYLES',
  'INNER_STYLES',
  'OUTER_STYLES',
] as const;

describe('tasty public style lists', () => {
  const exported = tasty as unknown as Record<string, unknown>;

  it.each(PUBLIC_STYLE_LISTS)('%s is still exported as an array', (name) => {
    // A renamed or withdrawn list would otherwise make the check below vacuous.
    expect(Array.isArray(exported[name]), name).toBe(true);
  });

  it('recognises every style in them', () => {
    const names = new Set<string>();
    for (const list of PUBLIC_STYLE_LISTS) {
      for (const name of exported[list] as string[]) names.add(name);
    }

    const unrecognised = [...names]
      .filter(
        (name) =>
          !KNOWN_TASTY_PROPERTIES.has(name) && !KNOWN_CSS_PROPERTIES.has(name),
      )
      .sort();

    expect(unrecognised).toEqual([]);
  });
});

/**
 * The sync guard for `BOOLEAN_TRUE_PROPERTIES`.
 *
 * `true` means "use the design-system default", which only works if the handler
 * actually resolves it. When one does not, the boolean reaches CSS verbatim —
 * `background-color: true` — and the browser drops the declaration, so the style
 * silently disappears. That is indistinguishable from a typo at lint time, which
 * is why the list has to be checked against the runtime rather than the docs.
 */
function swallowsTrue(property: string): boolean {
  return /(^|[^-\w])true([^-\w]|$)/.test(render(property, true as never) ?? '');
}

describe('`true` support', () => {
  it('is real for every property the plugin accepts it on', () => {
    expect([...BOOLEAN_TRUE_PROPERTIES].filter(swallowsTrue).sort()).toEqual(
      [],
    );
  });

  it('still leaks on `fill`, which is why `fill` is excluded', () => {
    // The canary for that exclusion. Tasty's docs list `fill` as accepting
    // `true`; its handler currently does not resolve it. When that is fixed this
    // test fails, which is the signal to put `fill` back into the set — rather
    // than the plugin going on reporting valid code.
    expect(render('fill', true as never)).toBe('background-color: true;');
    expect(BOOLEAN_TRUE_PROPERTIES.has('fill')).toBe(false);
  });

  it('resolves to a real declaration for a representative spread', () => {
    // Spot-checks that the guard above is not vacuous — these are the values a
    // reader would want to see written down.
    expect(render('padding', true as never)).toBe('padding: 8px;');
    expect(render('radius', true as never)).toBe('border-radius: 6px;');
    expect(render('color', true as never)).toBe('color: currentColor;');
    expect(render('hide', true as never)).toBe('display: none;');
    expect(render('blockPadding', true as never)).toBe('padding-block: 8px;');
    expect(render('inlineInset', true as never)).toBe('inset-inline: 0;');
  });
});
