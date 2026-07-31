# @tenphi/eslint-plugin-tasty

## 0.11.4

### Patch Changes

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Point `fontFamily` at `preset` instead of `font` for CSS-wide keywords.

  `font` resolves to `<value>, var(--font-sans, var(--font-sans-fallback))`, so it cannot express a CSS-wide keyword — following the hint for `fontFamily: 'inherit'` emits `font-family: inherit, var(--font-sans, …)`, which is invalid and drops the inherit entirely. The rule was steering authors toward broken CSS:

  ```js
  tasty({ styles: { fontFamily: 'inherit' } });
  // warning: Prefer tasty shorthand 'font: '...'' instead of 'fontFamily'
  ```

  `preset` is the property that handles these. A CSS-wide keyword used as the preset name short-circuits token lookup and is emitted verbatim across the whole typography group, so `preset: 'inherit'` produces a real `font-family: inherit`. The hint now names it:

  ```
  Prefer tasty shorthand 'preset: 'inherit'' instead of 'fontFamily'
  ```

  Applies to `inherit`, `initial`, `unset`, `revert` and `revert-layer`. A real font stack (`fontFamily: 'Inter'`) still points at `font: '...'`. The rule stays report-only for `fontFamily` either way — the two forms differ in scope (`preset` covers the whole typography group), so this is not a safe rename.

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Stop `valid-transition` reporting kebab-case CSS property names as unknown.

  A `transition` value names **CSS** properties, so they are spelled kebab-case — and Tasty emits any name it has no semantic mapping for verbatim into the CSS `transition`, which makes the kebab form the correct one. `KNOWN_CSS_PROPERTIES` is keyed by camelCase style keys, though, and the membership test used the raw name, so every kebab-case property without a `TRANSITION_SEMANTIC_MAPPING` entry was reported:

  ```
  warning tasty(valid-transition): Unknown transition name 'text-decoration-color'.
  ```

  The gap was invisible for the common cases because `TRANSITION_SEMANTIC_MAPPING` lists both spellings (`'background-color'` alongside `backgroundColor`) and is consulted first — so only properties absent from that map, such as `text-decoration-color` and `text-underline-offset`, hit the bad lookup.

  The name is now normalized to camelCase before the `KNOWN_CSS_PROPERTIES` check. Raw custom properties (`--gradient-angle`) are also accepted — `transition.ts`'s `getTiming()` handles that form explicitly.

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Accept the `longhand` output modifier on box properties in `valid-value`.

  `longhand` forces a box property to emit the individual CSS longhands instead of the shorthand, so children can selectively inherit a single side or corner (`radius: 'inherit right'`). It is documented for `padding`, `margin`, `inset`, `border` and `radius`, and honoured by the corresponding style handlers — but it was missing from every `acceptsMods` list in `PROPERTY_EXPECTATIONS`, so `valid-value` rejected the documented syntax as an error:

  ```
  error tasty(valid-value): Modifier 'longhand' is not valid for 'radius'.
                            Accepted: top, right, bottom, left, top-left, …
  ```

  `longhand` is now accepted on those five properties. `fade` and `outline` are unchanged — neither style handler reads the modifier.

  Added valid-case coverage for all five properties to `valid-value.test.ts`.

## 0.11.3

### Patch Changes

- [#34](https://github.com/tenphi/eslint-plugin-tasty/pull/34) [`5bc80aa`](https://github.com/tenphi/eslint-plugin-tasty/commit/5bc80aa89189d712c0bd53069780d6e5fdc2080d) Thanks [@tenphi](https://github.com/tenphi)! - Stop reporting sub-element styles twice in `consistent-token-usage`, `no-important` and `no-raw-color-values`.

  `STYLE_OBJECT_SELECTORS` includes the descendant selector `CallExpression ObjectExpression`, so inside `tasty({ styles: { Icon: { … } } })` the handler fires for the `styles` object **and** for the `Icon` object. These three rules recursed into any nested `ObjectExpression` as if it were a state map, so a sub-element's declarations were reported once while walking `styles` and again when the listener reached the sub-element itself:

  ```js
  tasty({ styles: { Icon: { width: '64px' } } });
  // consistent-token-usage: "Consider using '8x' instead of '64px'"  x2
  ```

  The recursion is now guarded by the existing `isStateMap()` helper, which excludes sub-elements (keys starting with an uppercase letter). `prefer-hide` and `prefer-custom-property-syntax` were already immune — the former only looks at the `display` key, the latter skips `/^[A-Z@&$#]/` keys explicitly.

  The duplicate report was the visible symptom, but the same code path also attributed the value to the **wrong property**, since the sub-element name was passed down as the property name. That silently affected rule behaviour rather than just the message count:
  - `no-raw-color-values` scopes its named-colour check to colour-bearing properties, so `Icon: { fill: 'red' }` was checked against the property `Icon`.
  - `consistent-token-usage` special-cases `radius` (`6px` → `1r`) and `border` (`1px` → `1bw`), which could not match when the property name was a sub-element.

  Genuine state maps — including state maps nested inside a sub-element, e.g. `Icon: { fill: { '': 'red' } }` — are unaffected and still reported exactly once. Added regression tests to all three rules covering both directions.

## 0.11.2

### Patch Changes

- [#32](https://github.com/tenphi/eslint-plugin-tasty/pull/32) [`57d7d9e`](https://github.com/tenphi/eslint-plugin-tasty/commit/57d7d9eb02fa3e50b80c038c9530be8263a52edd) Thanks [@tenphi](https://github.com/tenphi)! - Only treat `styles` and `*Styles` variables as style objects.

  The name test was `/styles?$/i`, which also matched the **singular** `style` — conventionally a DOM inline-style object holding raw CSS longhands, not tasty syntax. Every rule then ran against those objects and reported their longhands as violations:

  ```js
  // reported `top`, `left`, `right`, `bottom` and `maxWidth` as tasty problems
  const style = { position: 'absolute', top: '0px', maxWidth: '100%' };
  setStyle(element, style);
  ```

  `cube-ui-kit` had 5 findings from a single such object, plus more from `hostStyle: CSSProperties` and `baseStyle: Record<string, string>`.

  Detection is now `name === 'styles' || name.endsWith('Styles')`. An explicit `Styles` type annotation still opts a differently-named variable in, and the existing exclusion of `SCREAMING_CASE` names is unchanged.

  Added `src/context.test.ts` covering both directions. It probes through `prefer-shorthand-property` rather than `known-property`, because the properties involved (`top`, `maxWidth`) are perfectly _known_ — a `known-property` probe stays silent either way and would not catch this regression.

## 0.11.1

### Patch Changes

- [#30](https://github.com/tenphi/eslint-plugin-tasty/pull/30) [`23bdb86`](https://github.com/tenphi/eslint-plugin-tasty/commit/23bdb86820236944df696e5d906a584bb4712d4a) Thanks [@tenphi](https://github.com/tenphi)! - Fix `valid-value` rejecting the `dock` modifier that `prefer-directional-shorthand` auto-fixes to.

  0.11.0 taught the fixer to emit `inset: '0 bottom dock'` but did not add `dock` to `inset`'s modifier allowlist, so running `eslint --fix` turned a warning into an error:

  ```
  error tasty(valid-value): Modifier 'dock' is not valid for 'inset'.
                            Accepted: top, right, bottom, left.
  ```

  `dock` is now accepted for `inset` (and only `inset`) by both `valid-value` and `valid-directional-modifier`.

  Added an integration test that applies `prefer-directional-shorthand`'s fixes and re-lints the output against the whole `recommended` set, so a fix that emits a token the validation rules do not know about fails the suite instead of shipping.

## 0.11.0

### Minor Changes

- [#28](https://github.com/tenphi/eslint-plugin-tasty/pull/28) [`88dddd2`](https://github.com/tenphi/eslint-plugin-tasty/commit/88dddd23125ec95e52c0ab91e393d50776be4b80) Thanks [@tenphi](https://github.com/tenphi)! - Extend `prefer-directional-shorthand` to `radius`, `fade` and `border`, and teach it the `inset` `dock` modifier.

  0.10.0 restricted the rule to `margin`, `padding` and `inset` because the other properties had no lossless target. `@tenphi/tasty` 2.10 adds the two missing forms — single-corner `radius` modifiers and the `inset` `dock` modifier — so those rewrites are now expressible and the rule covers them. **Requires `@tenphi/tasty` >= 2.10** for the newly suggested syntax.

  **`radius` (auto-fixable)** — positions are corners, not sides, so the suggestion uses corner names:

  ```
  radius: '0 1r 0 0'  ->  radius: '1r top-right'
  radius: '4px 0 0 0' ->  radius: '4px top-left'
  ```

  **`inset` with `dock` (auto-fixable)** — three equal offsets around a single `auto` is one edge pinned with the perpendicular pair spanned:

  ```
  inset: 'auto 0 0 0' ->  inset: '0 bottom dock'
  inset: '0 0 0 auto' ->  inset: '0 right dock'
  ```

  **`fade` (auto-fixable)** — the extra groups in a 4-value `fade` are zero-length gradients, which are a no-op under `mask-composite: intersect`, so collapsing is equivalent and emits one mask layer instead of four:

  ```
  fade: '0 0 2x 0'    ->  fade: '2x bottom'
  ```

  **`border` (report-only, with a manual suggestion)** — four `border` tokens parse as a _single_ border value (width/style/color), not as a box, so `border: '0 0 1bw 0'` currently emits `border: 0 solid …` — no border on any side. The directional form is what the author meant, but applying it changes what renders, so the rule reports it with an explanation and offers the rewrite as an editor suggestion rather than an `eslint --fix`.

  **Suggestions always keep the explicit value** and never drop it in favour of the property default, because whether the two match is project-dependent. `margin` defaults to `var(--gap)` — 4px out of the box — while `1x` is 8px, so `margin: '0 0 1x 0'` -> `margin: 'bottom'` would silently halve the spacing. The rule emits `margin: '1x bottom'`.

  `DIRECTIONAL_BOX_IDENTITY` is replaced by `DIRECTIONAL_BOX`, which carries the identity token, the position names and whether the rewrite is auto-fixable per property.

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
