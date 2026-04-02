---
'@tenphi/eslint-plugin-tasty': patch
---

Fix false-positive in `valid-transition` rule: allow `##name` color property references (e.g. `##theme 0.3s`) alongside the existing `$$name` custom property references.
