---
'@tenphi/eslint-plugin-tasty': minor
---

Add experimental, opt-in `settings.tasty.typeAwareJSX` to distinguish declared
component props from Tasty style props in both ESLint and Oxlint. Resolve JSX prop
declarations with a lazily loaded, cached TypeScript program while preserving
existing value checks for style declarations and unresolved types.

Reuse unchanged parsed sources when lint buffers change, refresh reused ESLint
source objects after dependency/config edits, and keep primitive-union style
checks. TypeScript is optional; presets and existing consumers remain opt-in.
