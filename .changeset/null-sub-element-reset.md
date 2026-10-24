---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-sub-element` accepts a `null` sub-element, such as the reset in `mergeStyles(base, { Title: null })`, like it accepts `false`. Its report now names the value readably ("not a string", "not an array") instead of "not a object".
