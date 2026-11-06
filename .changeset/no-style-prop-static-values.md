---
'@tenphi/eslint-plugin-tasty': minor
---

`no-style-prop` takes a `values` option. `'static'` reports only a `style` whose every value is a literal, which always has a Tasty form, and leaves runtime values to the author. Under either setting, Tasty syntax in a `style` value (`'4x'`, `'#dark'`, `'$gap'`) is reported with its own message, since the browser drops it.
