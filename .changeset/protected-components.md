---
'@tenphi/eslint-plugin-tasty': minor
---

Add `tasty/no-protected-restyle` and the `protectedComponents` config key. A design system lists, in its `tasty.config.*`, the components consumers should customize through their props instead of restyling, and consumers inherit the list through `extends`. On those components the rule reports instance `styles` and `*Styles` props, appearance style props outside `allowedStyleProps`, and `tasty()` wrappers that restyle them. It follows aliases, namespace members, `tasty()` wrappers and relative re-exports. It is a warning in both presets and does nothing until a config lists protected components.
