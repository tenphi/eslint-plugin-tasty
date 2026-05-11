---
'@tenphi/eslint-plugin-tasty': patch
---

Update `valid-preset` rule to accept multiple space-separated modifiers in the slash section (e.g. `preset="h1 / strong italic"`) and in the modifier-only shorthand (e.g. `preset="bold italic"`). Each modifier token is now validated individually against the known modifier set, so unknown modifiers are reported per-token instead of treating the whole segment as one name.
