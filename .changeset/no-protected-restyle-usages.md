---
'@tenphi/eslint-plugin-tasty': minor
---

`no-protected-restyle` takes a `usages` option. `'wrappers'` reports only `tasty()` wrappers that restyle a protected component, and leaves instance `styles`, `*Styles` and style props alone, so a project can enforce the rule on its wrapper definitions first. The default, `'all'`, checks both as before.
