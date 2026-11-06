---
'@tenphi/eslint-plugin-tasty': patch
---

`no-runtime-styles-mutation` no longer checks a style object that no function encloses. Such an object is built once, while the module loads, so Tasty generates its CSS once whatever its values are: a call such as `cssVar('surface')` or `glaze.color(...).tasty()` in a module-level `tasty({ styles })` or palette is not a render-time value. An instance field still counts as render time, since it runs for every instance.
