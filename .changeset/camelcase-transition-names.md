---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-transition` reports a camelCase CSS name such as `gridTemplateColumns` or `maskSize`, with a suggestion for the kebab-case name. Tasty lowercases the name and emits it verbatim, so it compiles to no property at all (`gridtemplatecolumns`). Names with a semantic equivalent (`boxShadow`) keep the semantic suggestion, and `zIndex` is still accepted.
