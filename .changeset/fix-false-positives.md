---
"@tenphi/eslint-plugin-tasty": patch
---

Fix false positives across multiple rules:

- `valid-directional-modifier`: only check properties that actually support directional modifiers (border, radius, padding, margin, fade, inset), skip others like textAlign, transformOrigin, verticalAlign, transition
- `valid-value`: allow CSS global keywords (inherit, initial, unset, revert, revert-layer) on all properties; accept `inset` mod for shadow, `fixed` mod for width/height, `none`/`transparent` for fill/color
- `known-property`: allow CSS custom properties (`--*`) and vendor-prefixed properties (`-webkit-*`, etc.); add `container` and `interpolateSize` to known properties
- `valid-boolean-property`: add `shadow`, `margin`, `inset` to properties that accept boolean `true`
- `no-nested-selector`: skip `&::` pseudo-element patterns (no sub-element alternative exists)
