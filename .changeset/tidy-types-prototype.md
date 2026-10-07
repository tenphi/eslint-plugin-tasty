---
'@tenphi/eslint-plugin-tasty': minor
---

Add experimental, opt-in `settings.tasty.typeAwareJSX` to distinguish declared
component props from Tasty style props in both ESLint and Oxlint. Resolve JSX prop
declarations with a lazily loaded, cached TypeScript program while preserving
existing value checks for style declarations and unresolved types.
