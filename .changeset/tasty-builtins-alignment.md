---
'@tenphi/eslint-plugin-tasty': patch
---

Align four rules with what `@tenphi/tasty` does.

- `valid-color-token` no longer reports Tasty's built-in color tokens as unknown when the config lists `tokens`: `#current`, `#clear`, `#white`, `#black`, `#border` and `#outline`, with or without an opacity suffix. This includes the `#clear` that `prefer-custom-property-syntax` writes for `transparent`.
- `valid-transition` reports `flow` and `dimension`, which are not Tasty transition names (Tasty emits them verbatim as invalid CSS). It no longer suggests `flow` for `flex-direction` / `grid-auto-flow`, or `gridColumns` / `gridRows` for `grid-template-columns` / `grid-template-rows`.
- `valid-preset` accepts the `normal` modifier (`line-height: normal`), both after a slash (`h1 / normal`) and as the modifier-only shorthand (`preset: 'normal'`).
- Color token opacity suffixes are read as a decimal fraction, as Tasty reads them, so any digit string is valid: `#purple.150` (15%) and `#purple.999` (99.9%) no longer report "exceeds 100". A suffix that is not a digit string, such as `#purple.5.5`, is now reported.
