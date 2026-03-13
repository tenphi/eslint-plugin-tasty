---
"@tenphi/eslint-plugin-tasty": patch
---

Fix false-positive warnings for preset values, transition semantic names, and SCREAMING_CASE variable names

- Skip `preset` and `transition` properties in `valid-value` rule since they have dedicated validation rules (`valid-preset`, `valid-transition`)
- Add missing semantic transition names (`text`, `opacity`, `translate`, `rotate`, `scale`, `filter`, `image`, `background`, `width`, `height`, `zIndex`) to `SEMANTIC_TRANSITIONS`
- Exclude SCREAMING_CASE variable names (e.g. `TINT_STYLES`) from the style-object detection heuristic to avoid false `known-property` warnings on non-style objects
