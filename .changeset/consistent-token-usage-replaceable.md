---
'@tenphi/eslint-plugin-tasty': minor
---

`tasty/consistent-token-usage` takes a `pixels` option. With `pixels: 'replaceable'`, it reports only a pixel length that a unit replaces exactly: `8px` to `64px` in steps of `8px` (`1x` to `8x`), a `6px` radius (`1r`) and a `1px` border width (`1bw`). Every report then has a suggestion. Other pixel lengths, such as `width: 'max 520px'` or `inset: '-2px'`, are not reported, so a project whose layout sizes are pixels on purpose can run the rule as an error. In `padding: '8px 17px'` it reports `8px` only. The default, `pixels: 'all'`, reports every nonzero pixel length, as before.

A `fontSize`, `lineHeight` or `letterSpacing` length no longer gets an `x` suggestion, such as `5x` for a `40px` font size: it is on the type scale, and `x` is the spacing scale. By default it is still reported, without a suggestion. With `pixels: 'replaceable'`, it is not reported. The rule now has its own page, `docs/rules/consistent-token-usage.md`.
