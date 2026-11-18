---
'@tenphi/eslint-plugin-tasty': minor
---

`no-raw-color-values` now also reports raw colors in the color attributes of native elements (`fill`, `stroke`, `color`, `stopColor`, `floodColor`, `lightingColor` and their kebab-case spellings), such as `<circle stroke="#fff">`, and its message names the themable form: `currentColor` with a color token set through Tasty `color`, or Tasty's `svgFill` / `stroke` styles. `none`, `currentColor`, `transparent`, `inherit`, `context-fill`, `context-stroke`, `url()`, `var()`, dynamic values, content of `<clipPath>` and `<mask>`, and component props are not reported.
