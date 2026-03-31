---
'@tenphi/eslint-plugin-tasty': patch
---

Recognize `@inherit` as a valid value in `tasty/valid-value` rule. Extract `@own()` at root level check from `tasty/valid-state-key` into a new `tasty/no-own-at-root` rule configured as a warning in the recommended config.
