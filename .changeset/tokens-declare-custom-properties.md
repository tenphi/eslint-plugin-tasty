---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-custom-property` accepts custom properties declared through `tokens` in the same file: `$name` keys of a literal `tokens={{ … }}` JSX prop or of the `tokens` option of `tasty()` (or a configured options factory), and `'--name'` keys of a literal inline `style={{ … }}`, which set the same property. Following `no-style-prop`'s advice to move `'--progress'` into `tokens={{ $progress: … }}` no longer leads to an unknown-property warning. The message now says to declare the property "in a styles object or 'tokens' prop in this file", since the check covers the whole file.
