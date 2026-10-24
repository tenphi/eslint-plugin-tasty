---
'@tenphi/eslint-plugin-tasty': minor
---

`no-style-prop` gains an `elements` option: `'components'` reports `style` on every component and `'all'` on native elements too (default `'tasty'`, unchanged). With it, a project can remove `style` from `react/forbid-component-props` and `react/forbid-dom-props`, so a `style` exception names one rule and no longer hides the other props those rules forbid on the same line.
