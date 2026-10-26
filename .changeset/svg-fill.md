---
'@tenphi/eslint-plugin-tasty': patch
---

Recognize `svgFill`, Tasty's style for the native SVG `fill`. Tasty's own `fill` sets the background. `known-property` no longer reports `svgFill`, and its value is checked like `fill`'s, for color tokens and raw colors. It also accepts the SVG paint values `none`, `context-fill`, `context-stroke` and `url(#id)`. `valid-value` reports two shapes that Tasty renders wrong:
- a second value, such as `'none #red'` or `'#red, #blue'`, because Tasty keeps one color and drops the rest;
- a `#name` fallback after `url()`, such as `'url(#gradient) #purple'`, because Tasty passes a `url()` paint through as plain CSS and leaves the token unexpanded.
