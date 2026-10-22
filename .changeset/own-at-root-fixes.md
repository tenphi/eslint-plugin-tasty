---
'@tenphi/eslint-plugin-tasty': patch
---

`no-own-at-root`'s autofix unwraps each `@own(…)` term of a key on its own. Keys with several terms were corrupted: `'@own(pin-edge) & @own(pin=start)'` became `'pin-edge) & @own(pin=start'`. They now become `'pin-edge & pin=start'`. A term with operators inside stays grouped (`@own(hovered | focused) & active` → `(hovered | focused) & active`). A key whose `@own()` holds a comma is reported without a fix. The rule also no longer reports shared style objects declared on their own (`const CELL_STYLES: Styles`, a value of a `Record<K, Styles>`): they may be spread into a sub-element, where `@own()` is meaningful, and unwrapping it there silently changed which element the state matched.
