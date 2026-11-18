---
'@tenphi/eslint-plugin-tasty': patch
---

`prefer-shorthand-property` no longer reports `lineHeight` in a complete style: no preset reproduces an arbitrary line height, and a preset lets `lineHeight` override its own. Extension layers still report it.
