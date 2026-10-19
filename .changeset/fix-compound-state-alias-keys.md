---
'@tenphi/eslint-plugin-tasty': patch
---

Fix `no-unknown-state-alias` treating a whole state key that starts with an alias as one alias name. Compound keys like `'@selected | indeterminate'` are now parsed, and each `@name` alias is checked on its own wherever it appears in the key, including after operators, inside groups, and inside `@root()`/`@parent()`/`@own()`.
