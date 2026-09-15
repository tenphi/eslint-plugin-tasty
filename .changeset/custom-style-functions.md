---
'@tenphi/eslint-plugin-tasty': minor
---

Add `styleFunctions` configuration to validate custom imported helpers that accept
Tasty style objects or component options. Support configurable argument positions,
variadic style merging, variants, sub-elements, and `partial: true` for overrides
that rely on existing styles.
Track import aliases and ignore shadowed or type-only imports. Verify diagnostics
and safe fixes with both ESLint and oxlint, including the full recommended and
strict presets. Keep local aliases within variant style roots, accept TypeScript
wrappers on sub-elements, and skip uncertain argument positions after spreads.
