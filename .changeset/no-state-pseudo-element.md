---
'@tenphi/eslint-plugin-tasty': patch
---

`tasty/no-state-in-selector` no longer reports conditions on the element a pseudo-element belongs to, such as `a[rel="next"]::before`, `dialog[open]::backdrop`, `li:last-child::marker`, or the legacy `a[rel]:before`. Tasty now applies `@own(...)` on such a sub-element to the pseudo-element itself and drops the states a pseudo-element cannot have, so these conditions must stay in `$`. Conditions inside the pseudo-element (`::slotted(img:hover)`) are accepted for the same reason. Pseudo-classes after the pseudo-element (`@::part(label):hover`) are still reported, because `@own(:hover)` now expresses them exactly. Each item of a selector list is checked on its own.
