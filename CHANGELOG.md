# @tenphi/eslint-plugin-tasty

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
