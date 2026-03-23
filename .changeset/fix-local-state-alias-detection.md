---
'@tenphi/eslint-plugin-tasty': patch
---

Fix false positive "unknown state alias" warnings for locally defined states. The `valid-state-key` and `no-unknown-state-alias` rules now recognize `@name` keys with string values defined at the top level of the same `styles` object as valid local predefined state aliases, matching the runtime behavior of `extractLocalPredefinedStates()`.
