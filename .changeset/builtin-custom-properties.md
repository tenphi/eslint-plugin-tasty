---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-custom-property` no longer reports Tasty's built-in custom properties as unknown when the config lists `tokens`: `$gap`, `$radius`, `$border-width`, `$outline-width`, `$transition`, `$sharp-radius`, `$bold-font-weight`, `$font-sans-fallback` and `$font-mono-fallback`, including the `$$name` form. Before, they were accepted only when the plugin could load the `tasty.config.ts` that `@tenphi/tasty` ships, and that file lacks the two font fallbacks.
