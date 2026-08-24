import { all } from 'known-css-properties';

import { EMERGING_CSS_PROPERTIES, KNOWN_CSS_PROPERTIES } from './constants.js';

/**
 * The sync guard for the CSS property list.
 *
 * `known-property` is the only thing standing between a style key and a report, and
 * tasty renders every camelCase key straight through to CSS — so a property missing
 * from the list is a false positive on valid CSS, and the list only stays right if
 * it is derived from data. This re-derives it from `known-css-properties` and fails
 * on drift. Regenerate with `pnpm generate:css-properties`, do not edit by hand.
 */

const kebabToCamel = (name: string) =>
  name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

const dataset = all.filter((name) => !name.startsWith('-'));
const datasetCamel = new Set(dataset.map(kebabToCamel));
const EMERGING = new Set(EMERGING_CSS_PROPERTIES);

describe('KNOWN_CSS_PROPERTIES', () => {
  it('covers every non-prefixed property in the dataset', () => {
    const missing = [...datasetCamel].filter(
      (name) => !KNOWN_CSS_PROPERTIES.has(name),
    );

    expect(missing).toEqual([]);
  });

  it('prunes emerging properties the dataset now covers', () => {
    // Entries only earn their place while the dataset lacks them. Once it catches
    // up, the generated list carries them and the hand-maintained copy is drift
    // waiting to happen — so it has to go.
    const stale = [...KNOWN_CSS_PROPERTIES].filter(
      (name) => !datasetCamel.has(name) && !EMERGING.has(name),
    );

    expect(stale).toEqual([]);
  });

  it('holds no vendor-prefixed spellings', () => {
    // `known-property` exempts keys starting with `-`, and tasty emits a vendor
    // declaration from the literal kebab-case key — never from `webkitMask`.
    const prefixed = [...KNOWN_CSS_PROPERTIES].filter((name) =>
      /^(webkit|moz|ms|o)[A-Z]/.test(name),
    );

    expect(prefixed).toEqual([]);
  });

  it('accepts the modern properties the hand-maintained list used to reject', () => {
    // Each of these was reported as an unknown property while the list was
    // maintained by hand, on code tasty renders correctly.
    for (const property of [
      'mask',
      'maskSize',
      'anchorName',
      'positionArea',
      'fieldSizing',
      'viewTransitionName',
      'textBox',
      'textWrapStyle',
      'cornerShape',
      'readingFlow',
      'itemFlow',
    ]) {
      expect(KNOWN_CSS_PROPERTIES.has(property)).toBe(true);
    }
  });

  it('still rejects misspellings', () => {
    for (const typo of ['colour', 'boarder', 'paddng', 'bakcground']) {
      expect(KNOWN_CSS_PROPERTIES.has(typo)).toBe(false);
    }
  });
});
