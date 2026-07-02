---
'@tenphi/eslint-plugin-tasty': minor
---

Extend `no-raw-color-values` and `prefer-custom-property-syntax` with new raw-syntax warnings (all in the `recommended` preset at `warn`):

- `no-raw-color-values` now also flags modern color functions (`okhsl`, `okhsv`, `okhst`, `oklab`, `oklch`, `lab`, `lch`, `hwb`, `color`, `device-cmyk`, `light-dark`) and CSS named colors (`red`, `blue`, …) on color-bearing properties. Named-color checks skip `#token` and `$prop` references to avoid false positives.
- `prefer-custom-property-syntax` now also suggests `#color` for `$x-color` custom-property references, `#clear` for the `transparent` keyword, and `#current` for the `currentColor` keyword. `var(--x, transparent)` / `var(--x, currentColor)` fallbacks are normalized to `#clear` / `#current` in the suggestion.
