/**
 * Regenerates the `DATASET_CSS_PROPERTIES` block in `src/constants.ts`.
 *
 * The list is derived from `known-css-properties` — the MDN/W3C-sourced dataset
 * stylelint uses for `property-no-unknown` — minus the at-rule descriptors that
 * `@webref/css` says are not properties. Tasty renders any camelCase style key
 * straight through to its kebab-case CSS declaration, so a hand-maintained list is
 * the only thing standing between a valid modern property and a false positive from
 * `known-property`. Regenerate after bumping the dataset:
 *
 *   pnpm generate:css-properties
 *
 * Properties that ship in browsers but have not landed in the dataset yet go in
 * `EMERGING_CSS_PROPERTIES`, which is hand-maintained — see `src/constants.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { all } from 'known-css-properties';
import webref from '@webref/css';

const TARGET = new URL('../src/constants.ts', import.meta.url);
const START = 'const DATASET_CSS_PROPERTIES = [';
const END = '];';

const kebabToCamel = (name) =>
  name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

/**
 * The dataset is stylelint's, so it also lists at-rule descriptors (`src`,
 * `prefix`, `syntax`), which a style rule cannot declare. The W3C specs, by way
 * of `@webref/css`, say which names are descriptors and nothing else; a name that
 * is both (`font-weight`, `speak-as`) stays.
 */
const { atrules, properties: specProperties } = await webref.listAll();
const specPropertyNames = new Set(specProperties.map(({ name }) => name));
const descriptorsOnly = new Set(
  atrules
    .flatMap(({ descriptors = [] }) => descriptors.map(({ name }) => name))
    .filter((name) => !specPropertyNames.has(name)),
);

/**
 * Vendor-prefixed entries are dropped: `known-property` already exempts every key
 * starting with `-`, and their camelCase spellings (`webkitMask`) are not what tasty
 * emits — a `-webkit-` declaration is written in kebab-case as a literal key.
 */
const properties = [
  ...new Set(
    all
      .filter((name) => !name.startsWith('-') && !descriptorsOnly.has(name))
      .map(kebabToCamel),
  ),
].sort();

const source = readFileSync(TARGET, 'utf8');
const start = source.indexOf(START);

if (start === -1) throw new Error(`Could not find "${START}" in src/constants.ts`);

const end = source.indexOf(`\n${END}`, start);

if (end === -1) throw new Error('Could not find the end of DATASET_CSS_PROPERTIES');

const block = [
  START,
  ...properties.map((name) => `  '${name}',`),
  END,
].join('\n');

writeFileSync(TARGET, source.slice(0, start) + block + source.slice(end + 1 + END.length));

console.log(`Wrote ${properties.length} properties to src/constants.ts`);
