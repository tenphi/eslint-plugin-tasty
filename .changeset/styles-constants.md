---
'@tenphi/eslint-plugin-tasty': patch
---

A `Styles` type annotation is read before the variable's name, so `export const CARD_STYLES: Styles = { … }` is now linted like `cardStyles: Styles`. Before, every SCREAMING_CASE constant was skipped, and the `$name` keys it declared were missing from `valid-custom-property`'s file set. An unannotated constant is still not matched on its name. A map of styles (`Record<K, Styles>`, `{ [key: string]: Styles }`, `{ root: Styles }`) is no longer checked as a style object itself: its values are, so variant names are not reported as unknown properties. `valid-sub-element` no longer reports a sub-element whose value is a binding (`Prefix: ADD_STYLES`): a `const` is followed to its value, and any other binding, member or call is accepted as a possible style object.
