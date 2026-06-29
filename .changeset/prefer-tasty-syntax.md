---
'@tenphi/eslint-plugin-tasty': minor
---

Add "prefer Tasty syntax" rules and promote them to the recommended config:

- **`valid-default-state-order`** — warn when `''` is not the first state key or is redundant alongside lone `_`
- **`prefer-auto-calc`** — suggest `(...)` instead of `calc(...)`
- **`prefer-custom-property-syntax`** — suggest `$prop` / `(#color, fallback)` instead of `var(--...)`
- **`prefer-hide`** — suggest `hide: true` instead of `display: 'none'`
- **`prefer-directional-shorthand`** — suggest `1x bottom` instead of `0 0 1x 0` box syntax
- Extend **`prefer-shorthand-property`** mappings (`backgroundImage`, `fontFamily`, `flexGrow`/`Shrink`/`Basis`, scrollbar/grid/inset/outline/lineClamp, etc.)
- Extend **`valid-transition`** with semantic-name suggestions (`background-color` → `fill`, etc.)

Move `prefer-shorthand-property`, `no-raw-color-values`, and `consistent-token-usage` from strict into recommended (all `warn`).

Improve error messages across existing rules to state what is wrong and how to fix it.
