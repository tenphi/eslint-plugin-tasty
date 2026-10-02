---
'@tenphi/eslint-plugin-tasty': patch
---

Report sub-element `$` selectors such as `&:is(h1)` that style the containing element as `valid-sub-element` errors. Root pseudo-elements remain valid; use property state maps in the containing scope or descendant selectors for heading presets.
