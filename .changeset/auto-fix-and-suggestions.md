---
'@tenphi/eslint-plugin-tasty': minor
---

Add auto-fix and suggestion support to fixable rules, enforce `_` floor ordering, and reclassify `no-nested-selector` as an error.

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
