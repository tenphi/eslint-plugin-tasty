---
'@tenphi/eslint-plugin-tasty': patch
---

Fix false-positive in `valid-state-key` rule: `@root()`, `@parent()`, and `@own()` tokenizer patterns now handle nested parentheses from pseudo-classes like `:is()`, `:has()`, `:not()`, and `:where()` (e.g. `@parent(:is(details), >)`).
