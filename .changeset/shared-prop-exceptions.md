---
'@tenphi/eslint-plugin-tasty': minor
---

`no-style-prop` and `no-classname-prop` now honor disable directives for `react/forbid-component-props`, which reports the same attribute when a project forbids `style` or `className` on components. One reasoned exception for the React rule now covers both, instead of a directive naming each. A new `alsoDisabledBy` option lists the rules that count (default `['react/forbid-component-props']`; `[]` restores the old behavior).
