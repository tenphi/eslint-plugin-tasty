---
'@tenphi/eslint-plugin-tasty': patch
---

Recognize `svgFill`, Tasty's style for the native SVG `fill` (Tasty's own `fill` sets the background). `known-property` no longer reports it, and its value is checked like `fill`'s: color tokens, raw colors, and the SVG paint values `none`, `context-fill`, `context-stroke` and `url(#id)`.
