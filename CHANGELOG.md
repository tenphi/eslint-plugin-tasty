# @tenphi/eslint-plugin-tasty

## 0.10.0

### Minor Changes

- [#26](https://github.com/tenphi/eslint-plugin-tasty/pull/26) [`eccdd9d`](https://github.com/tenphi/eslint-plugin-tasty/commit/eccdd9dad5f92d175929b464d64f30ddff784dde) Thanks [@tenphi](https://github.com/tenphi)! - Reverse the `flex` mapping and stop `prefer-directional-shorthand` from dropping real values.

  **`flex` is now the discouraged property, not the target.** `prefer-shorthand-property` previously mapped `flexGrow` / `flexShrink` / `flexBasis` → `flex`, which is backwards: `flex` resets the components you omit to values that are not their CSS initial. `flex: '0'` expands to `flex-grow: 0; flex-shrink: 1; flex-basis: 0%`, so it cannot express `flexShrink: 0` ("do not shrink") at all — following the old advice inverted the author's intent. The three longhand mappings are removed, and a new **`prefer-longhand-property`** rule reports `flex` in favour of `flexGrow` / `flexShrink` / `flexBasis` (`error` in `recommended`). The longhands also each carry their own state map, which `flex` cannot.

  **`prefer-directional-shorthand` is now identity-aware and no longer suggests lossy rewrites.** The rule hard-coded `0` as the placeholder for an unset side, which is only correct for properties whose CSS initial is `0`:
  - **`inset`** — the initial is `auto`, so a `0` is a real offset. `inset: 'auto 0 0 0'` was reported as `'auto top'`, which emits `inset: auto` and silently drops three real values. `inset` is now checked against an `auto` identity, so that case is valid and `inset: '0 auto auto auto'` → `'0 top'` still reports.
  - **`radius`** — the four positions are corners, and a directional modifier addresses a corner _pair_ (`radius: '4px bottom'` rounds both bottom corners). A single-corner value has no directional equivalent, so `radius` is excluded.
  - **`border`** — four tokens parse as one border value (width/style/color), not as a box, so there are no per-side placeholders to collapse. Excluded.
  - **`fade`** — each side becomes its own gradient layer, so collapsing changes the emitted `mask`. Excluded.

  `margin` and `padding` are unaffected and still auto-fix.

## 0.9.0

### Minor Changes

- [#24](https://github.com/tenphi/eslint-plugin-tasty/pull/24) [`84afaa0`](https://github.com/tenphi/eslint-plugin-tasty/commit/84afaa0e89cff1d529489526c5edb8f85518256d) Thanks [@tenphi](https://github.com/tenphi)! - Add auto-fix and suggestion support to fixable rules, enforce `_` floor ordering, and reclassify `no-nested-selector` as an error.

  **Auto-fixable (`fixable: 'code'`, applied by `eslint --fix`):**
  - `no-important`: strips `!important` from style values.
  - `prefer-auto-calc`: rewrites `calc(x)` → `(x)` per occurrence.
  - `prefer-directional-shorthand`: rewrites 4-value box syntax with zero placeholders to directional shorthand (`1x bottom`).
  - `prefer-shorthand-property`: renames the safe carry-over subset of native CSS keys to Tasty shorthands (`backgroundColor` → `fill`, `borderRadius` → `radius`). Directional / `min|max` / `border-*` / `image` mappings stay report-only because the rename changes runtime semantics.
  - `no-own-at-root`: unwraps redundant `@own(inner)` → `inner` on the state key.
  - `valid-default-state-order`: fixes misplaced `''` default and `_` floor (move/remove), and now treats `''` as redundant when `_` is the only other state.
  - `prefer-custom-property-syntax`: rewrites `var(--x)` → `$x`, `var(--x, fb)` → `($x, fb)` (incl. `transparent`/`currentColor` fallback normalization), `$x-color` → `#x`, `transparent` → `#clear`, and `currentColor` → `#current`.
  - `prefer-hide`: rewrites `display: 'none'` → `hide: true` (direct-value case only; state-map case stays report-only).

  **Suggestions (`hasSuggestions: true`, manual quick-fix):**
  - `valid-transition`: offers a semantic-name swap for `preferSemanticTransition` (e.g. `background-color` → `fill`); `unknownTransition` stays report-only.
  - `consistent-token-usage`: offers `8px` → `1x`, `6px` → `1r` (radius), and `1px` → `1bw` (border).
  - `valid-radius-shape`: offers the closest valid shape when one is found.

  **`valid-default-state-order` is now `_`-fallback-aware:** the `_` fallback floor must be the first key in a state map, with the `''` default right after it — matching the runtime cascade order. This fixes a latent false-positive that flagged the correct `{ _: …, '': …, hovered }` order. Maps where `''` is the only other state besides `_` now report `redundantDefaultState`.

  **`no-nested-selector` reclassified:** it is now a non-fixable `problem` (incorrect syntax, not a style preference) and defaults to `error` in the `recommended` preset.

- [#24](https://github.com/tenphi/eslint-plugin-tasty/pull/24) [`84afaa0`](https://github.com/tenphi/eslint-plugin-tasty/commit/84afaa0e89cff1d529489526c5edb8f85518256d) Thanks [@tenphi](https://github.com/tenphi)! - Extend `no-raw-color-values` and `prefer-custom-property-syntax` with new raw-syntax warnings (all in the `recommended` preset at `warn`):
  - `no-raw-color-values` now also flags modern color functions (`okhsl`, `okhsv`, `okhst`, `oklab`, `oklch`, `lab`, `lch`, `hwb`, `color`, `device-cmyk`, `light-dark`) and CSS named colors (`red`, `blue`, …) on color-bearing properties. Named-color checks skip `#token` and `$prop` references to avoid false positives.
  - `prefer-custom-property-syntax` now also suggests `#color` for `$x-color` custom-property references, `#clear` for the `transparent` keyword, and `#current` for the `currentColor` keyword. `var(--x, transparent)` / `var(--x, currentColor)` fallbacks are normalized to `#clear` / `#current` in the suggestion.

## 0.8.0

### Minor Changes

- [`87584bf`](https://github.com/tenphi/eslint-plugin-tasty/commit/87584bf3581762a3745034c77d4334b6a483bf39) Thanks [@tenphi](https://github.com/tenphi)! - Add "prefer Tasty syntax" rules and promote them to the recommended config:
  - **`valid-default-state-order`** — warn when `''` is not the first state key or is redundant alongside lone `_`
  - **`prefer-auto-calc`** — suggest `(...)` instead of `calc(...)`
  - **`prefer-custom-property-syntax`** — suggest `$prop` / `(#color, fallback)` instead of `var(--...)`
  - **`prefer-hide`** — suggest `hide: true` instead of `display: 'none'`
  - **`prefer-directional-shorthand`** — suggest `1x bottom` instead of `0 0 1x 0` box syntax
  - Extend **`prefer-shorthand-property`** mappings (`backgroundImage`, `fontFamily`, `flexGrow`/`Shrink`/`Basis`, scrollbar/grid/inset/outline/lineClamp, etc.)
  - Extend **`valid-transition`** with semantic-name suggestions (`background-color` → `fill`, etc.)

  Move `prefer-shorthand-property`, `no-raw-color-values`, and `consistent-token-usage` from strict into recommended (all `warn`).

  Improve error messages across existing rules to state what is wrong and how to fix it.

## 0.7.0

### Minor Changes

- [`d52f870`](https://github.com/tenphi/eslint-plugin-tasty/commit/d52f87036ae27a928f81a0541964de5e97c8386e) Thanks [@tenphi](https://github.com/tenphi)! - Support the `_` fallback floor key in state maps. A standalone `_` is now accepted as a valid state key (an always-on, map-wide fallback floor), `valid-state-key` reports an error when `_` is combined with other state logic (e.g. `_ & hovered`), `require-default-state` accepts a `_` floor as satisfying the default requirement, and `valid-styles-structure` flags a `_` key used at the top level. Docs updated accordingly.

## 0.6.4

### Patch Changes

- [`9adb26e`](https://github.com/tenphi/eslint-plugin-tasty/commit/9adb26e81082f69a7135669d527d05917d6d9415) Thanks [@tenphi](https://github.com/tenphi)! - Update `valid-preset` rule to accept multiple space-separated modifiers in the slash section (e.g. `preset="h1 / strong italic"`) and in the modifier-only shorthand (e.g. `preset="bold italic"`). Each modifier token is now validated individually against the known modifier set, so unknown modifiers are reported per-token instead of treating the whole segment as one name.

## 0.6.3

### Patch Changes

- [`60f9235`](https://github.com/tenphi/eslint-plugin-tasty/commit/60f92356d0547bfde701ceb0c2701986f1c68bad) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive in `valid-state-key` rule: `@root()`, `@parent()`, and `@own()` tokenizer patterns now handle nested parentheses from pseudo-classes like `:is()`, `:has()`, `:not()`, and `:where()` (e.g. `@parent(:is(details), >)`).

## 0.6.2

### Patch Changes

- [`d7f869c`](https://github.com/tenphi/eslint-plugin-tasty/commit/d7f869c00099457fc6d819608e056f0a03eac474) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive in `valid-transition` rule: allow `##name` color property references (e.g. `##theme 0.3s`) alongside the existing `$$name` custom property references.

## 0.6.1

### Patch Changes

- [#16](https://github.com/tenphi/eslint-plugin-tasty/pull/16) [`300c8c8`](https://github.com/tenphi/eslint-plugin-tasty/commit/300c8c894961afbcbf69762271a31233427940f7) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive warnings: add missing CSS functions (calc-size, math, anchor, scroll-driven, etc.), allow color tokens in `fade` property, allow `false` to disable sub-element styles, and recognize SVG presentation attributes as known CSS properties.

## 0.6.0

### Minor Changes

- [#14](https://github.com/tenphi/eslint-plugin-tasty/pull/14) [`229311d`](https://github.com/tenphi/eslint-plugin-tasty/commit/229311d0e125ea97ee3bdd546d1aa4acbc3efffc) Thanks [@tenphi](https://github.com/tenphi)! - Update valid-preset rule to support slash-separated modifier syntax (`h2 / strong`) and add `bold` and `icon` to known preset modifiers.

## 0.5.1

### Patch Changes

- [`6e5b1c3`](https://github.com/tenphi/eslint-plugin-tasty/commit/6e5b1c3ef2247ea86fce6e77a1f1a5e72e785acf) Thanks [@tenphi](https://github.com/tenphi)! - Recognize `@inherit` as a valid value in `tasty/valid-value` rule. Extract `@own()` at root level check from `tasty/valid-state-key` into a new `tasty/no-own-at-root` rule configured as a warning in the recommended config.

## 0.5.0

### Minor Changes

- [`e92ce58`](https://github.com/tenphi/eslint-plugin-tasty/commit/e92ce5874a5e2c257d31828f72bc9a6b25468246) Thanks [@tenphi](https://github.com/tenphi)! - Cascading config resolution and false-positive fixes.
  - Config files (`tasty.config.ts`) are now merged from all directories between the linted file and the project root, with nearest having the highest priority. This enables per-directory config overrides without duplicating parent settings.
  - The `@tenphi/tasty` package config is auto-discovered from `node_modules` and used as the implicit base layer. Explicit `extends: '@tenphi/tasty'` is no longer needed.
  - Added missing CSS properties to the known set: all `scrollMargin*` and `scrollPadding*` directional variants, and `textSizeAdjust`.
  - Added grid layout properties (`gridArea`, `gridColumn`, `gridRow`, and their start/end variants) to the skip list since they accept arbitrary named identifiers.
  - Fixed false-positive `unknownToken` reports for passthrough properties (e.g., `textOverflow: 'ellipsis'`).

## 0.4.4

### Patch Changes

- [`ec0ed06`](https://github.com/tenphi/eslint-plugin-tasty/commit/ec0ed061fc145aab1e12457c4362600c262b4f79) Thanks [@tenphi](https://github.com/tenphi)! - Fix false positive "unknown state alias" warnings for locally defined states. The `valid-state-key` and `no-unknown-state-alias` rules now recognize `@name` keys with string values defined at the top level of the same `styles` object as valid local predefined state aliases, matching the runtime behavior of `extractLocalPredefinedStates()`.

## 0.4.3

### Patch Changes

- [`6bd12ae`](https://github.com/tenphi/eslint-plugin-tasty/commit/6bd12ae5ec1befef430abb1147dc676f873ced67) Thanks [@tenphi](https://github.com/tenphi)! - Support imports in `tasty.config.ts` via jiti, enabling dynamic token lists derived from theme files.

## 0.4.2

### Patch Changes

- [`83752d9`](https://github.com/tenphi/eslint-plugin-tasty/commit/83752d90fc16c6402948a56808fe380f6298035e) Thanks [@tenphi](https://github.com/tenphi)! - Fix preset validation.

## 0.4.1

### Patch Changes

- [`96a1b1c`](https://github.com/tenphi/eslint-plugin-tasty/commit/96a1b1c86aa9d2a2cddfabc4e8b871a89026944e) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive warnings for preset values, transition semantic names, and SCREAMING_CASE variable names
  - Skip `preset` and `transition` properties in `valid-value` rule since they have dedicated validation rules (`valid-preset`, `valid-transition`)
  - Add missing semantic transition names (`text`, `opacity`, `translate`, `rotate`, `scale`, `filter`, `image`, `background`, `width`, `height`, `zIndex`) to `SEMANTIC_TRANSITIONS`
  - Exclude SCREAMING_CASE variable names (e.g. `TINT_STYLES`) from the style-object detection heuristic to avoid false `known-property` warnings on non-style objects

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
