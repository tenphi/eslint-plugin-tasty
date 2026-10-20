---
'@tenphi/eslint-plugin-tasty': minor
---

Add `tasty/no-ignored-pseudo-element-state`, enabled as an error in the recommended and strict presets, like `valid-state-key`'s check for a misused `_` fallback key, which Tasty also ignores with a runtime warning. When a sub-element's `$` ends in a pseudo-element, Tasty applies `@own(...)` to the pseudo-element itself and ignores states a pseudo-element cannot have, with a `PSEUDO_ELEMENT_STATE_IGNORED` warning at runtime. The rule reports those states while you edit: modifiers (`@own(hovered)`), attributes (`@own([open])`), classes and IDs, tree-structural pseudo-classes (`@own(:last-child)`, `:nth-*()`, `:has()`), and keys that combine one of them with other states. It also covers `&` keys and the root states of `useGlobalStyles()` / `tastyStatic()` selectors that end in a pseudo-element. Write a condition on the element the pseudo-element belongs to in the selector instead: `$: 'a[rel="next"]::before'`.
