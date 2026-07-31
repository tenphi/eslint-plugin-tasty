---
'@tenphi/eslint-plugin-tasty': patch
---

Point `fontFamily` at `preset` instead of `font` for CSS-wide keywords.

`font` resolves to `<value>, var(--font-sans, var(--font-sans-fallback))`, so it cannot express a CSS-wide keyword — following the hint for `fontFamily: 'inherit'` emits `font-family: inherit, var(--font-sans, …)`, which is invalid and drops the inherit entirely. The rule was steering authors toward broken CSS:

```js
tasty({ styles: { fontFamily: 'inherit' } });
// warning: Prefer tasty shorthand 'font: '...'' instead of 'fontFamily'
```

`preset` is the property that handles these. A CSS-wide keyword used as the preset name short-circuits token lookup and is emitted verbatim across the whole typography group, so `preset: 'inherit'` produces a real `font-family: inherit`. The hint now names it:

```
Prefer tasty shorthand 'preset: 'inherit'' instead of 'fontFamily'
```

Applies to `inherit`, `initial`, `unset`, `revert` and `revert-layer`. A real font stack (`fontFamily: 'Inter'`) still points at `font: '...'`. The rule stays report-only for `fontFamily` either way — the two forms differ in scope (`preset` covers the whole typography group), so this is not a safe rename.
