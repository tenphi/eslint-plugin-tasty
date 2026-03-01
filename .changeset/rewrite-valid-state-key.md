---
"@tenphi/eslint-plugin-tasty": minor
---

Rewrite `valid-state-key` rule to use the real `parseStateKey` parser from `@tenphi/tasty/core` instead of hand-rolled regex validation. This provides deeper semantic checks including tokenization coverage, empty/invalid advanced state detection, and `@own()` sub-element enforcement.
