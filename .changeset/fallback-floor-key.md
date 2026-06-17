---
'@tenphi/eslint-plugin-tasty': minor
---

Support the `_` fallback floor key in state maps. A standalone `_` is now accepted as a valid state key (an always-on, map-wide fallback floor), `valid-state-key` reports an error when `_` is combined with other state logic (e.g. `_ & hovered`), `require-default-state` accepts a `_` floor as satisfying the default requirement, and `valid-styles-structure` flags a `_` key used at the top level. Docs updated accordingly.
