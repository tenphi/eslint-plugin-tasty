# @tenphi/eslint-plugin-tasty

## 0.4.0

### Minor Changes

- [`50b5d97`](https://github.com/tenphi/eslint-plugin-tasty/commit/50b5d970aa65ee076d309c7eba360d57800ecb31) Thanks [@tenphi](https://github.com/tenphi)! - Improve various rules and bring own parser for enchanced validation.

## 0.3.1

### Patch Changes

- [`a15ee6a`](https://github.com/tenphi/eslint-plugin-tasty/commit/a15ee6a6d39e4297803a30e443ecdeac68ef4483) Thanks [@tenphi](https://github.com/tenphi)! - Fix `@parent(...)` being flagged as an unknown state alias by adding `@parent` to `BUILT_IN_STATE_PREFIXES`. Also handle `parent` type in `collectIssues` for recursive inner condition validation.

## 0.3.0

### Minor Changes

- [`fd9d0b9`](https://github.com/tenphi/eslint-plugin-tasty/commit/fd9d0b92731f46753c5a4a5ba4e978336bc317b8) Thanks [@tenphi](https://github.com/tenphi)! - Detect style objects in variable declarations (not only inside `tasty()` calls). Variables with names ending in `style`/`styles` (case-insensitive) or typed as `Styles` are now validated. Handles TypeScript type annotations (`TSAsExpression`, `TSSatisfiesExpression`, etc.).

  Move `valid-recipe` and `valid-preset` rules to the `recommended` config. Both rules now use the broader `ObjectExpression` selector to catch style variables.

  Fix `valid-preset` to allow CSS global keywords (`inherit`, `initial`, `unset`, `revert`).

  Fix config `extends` resolution to find `tasty.config.*` files inside npm packages (walk `node_modules` instead of `require.resolve`). Strip comments and use balanced brace matching when parsing TS/JS config files.

## 0.2.2

### Patch Changes

- [`401bfe8`](https://github.com/tenphi/eslint-plugin-tasty/commit/401bfe8e513f8cd9c75310fd622a94ea02bcb8a3) Thanks [@tenphi](https://github.com/tenphi)! - Fix false positives across multiple rules:
  - `valid-directional-modifier`: only check properties that actually support directional modifiers (border, radius, padding, margin, fade, inset), skip others like textAlign, transformOrigin, verticalAlign, transition
  - `valid-value`: allow CSS global keywords (inherit, initial, unset, revert, revert-layer) on all properties; accept `inset` mod for shadow, `fixed` mod for width/height, `none`/`transparent` for fill/color
  - `known-property`: allow CSS custom properties (`--*`) and vendor-prefixed properties (`-webkit-*`, etc.); add `container` and `interpolateSize` to known properties
  - `valid-boolean-property`: add `shadow`, `margin`, `inset` to properties that accept boolean `true`
  - `no-nested-selector`: skip `&::` pseudo-element patterns (no sub-element alternative exists)

## 0.2.1

### Patch Changes

- [`3460a12`](https://github.com/tenphi/eslint-plugin-tasty/commit/3460a123d353a68b4cc14708651ffd246bda9f6e) Thanks [@tenphi](https://github.com/tenphi)! - Fix build output to use `.js`/`.d.ts` extensions instead of `.mjs`/`.d.mts`, matching the `exports` map in `package.json`.

## 0.2.0

### Minor Changes

- [`4603b98`](https://github.com/tenphi/eslint-plugin-tasty/commit/4603b9882da80ab43d3628ad5645085615a8d01a) Thanks [@tenphi](https://github.com/tenphi)! - Rewrite `valid-state-key` rule to use the real `parseStateKey` parser from `@tenphi/tasty/core` instead of hand-rolled regex validation. This provides deeper semantic checks including tokenization coverage, empty/invalid advanced state detection, and `@own()` sub-element enforcement.
