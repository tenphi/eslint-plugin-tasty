---
'@tenphi/eslint-plugin-tasty': minor
---

Reverse the `flex` mapping and stop `prefer-directional-shorthand` from dropping real values.

**`flex` is now the discouraged property, not the target.** `prefer-shorthand-property` previously mapped `flexGrow` / `flexShrink` / `flexBasis` → `flex`, which is backwards: `flex` resets the components you omit to values that are not their CSS initial. `flex: '0'` expands to `flex-grow: 0; flex-shrink: 1; flex-basis: 0%`, so it cannot express `flexShrink: 0` ("do not shrink") at all — following the old advice inverted the author's intent. The three longhand mappings are removed, and a new **`prefer-longhand-property`** rule reports `flex` in favour of `flexGrow` / `flexShrink` / `flexBasis` (`error` in `recommended`). The longhands also each carry their own state map, which `flex` cannot.

**`prefer-directional-shorthand` is now identity-aware and no longer suggests lossy rewrites.** The rule hard-coded `0` as the placeholder for an unset side, which is only correct for properties whose CSS initial is `0`:

- **`inset`** — the initial is `auto`, so a `0` is a real offset. `inset: 'auto 0 0 0'` was reported as `'auto top'`, which emits `inset: auto` and silently drops three real values. `inset` is now checked against an `auto` identity, so that case is valid and `inset: '0 auto auto auto'` → `'0 top'` still reports.
- **`radius`** — the four positions are corners, and a directional modifier addresses a corner *pair* (`radius: '4px bottom'` rounds both bottom corners). A single-corner value has no directional equivalent, so `radius` is excluded.
- **`border`** — four tokens parse as one border value (width/style/color), not as a box, so there are no per-side placeholders to collapse. Excluded.
- **`fade`** — each side becomes its own gradient layer, so collapsing changes the emitted `mask`. Excluded.

`margin` and `padding` are unaffected and still auto-fix.
