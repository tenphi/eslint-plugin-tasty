---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-value` accepts `display: '-webkit-box'` and `'-webkit-inline-box'`, which multi-line truncation with `-webkit-line-clamp` still needs. It also accepts an unspaced ratio such as `aspectRatio: '16/10'`, the same as `'16 / 10'`, since `<ratio>` allows optional whitespace around the slash. Other properties still report a ratio, such as `opacity: '1/2'`.
