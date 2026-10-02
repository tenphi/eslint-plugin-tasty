---
'@tenphi/eslint-plugin-tasty': patch
---

Improve `no-style-spread` to recommend `mergeStyles` when multiple spreads compose a style object, with one warning explaining the risk of losing sub-element properties and state-map entries.
