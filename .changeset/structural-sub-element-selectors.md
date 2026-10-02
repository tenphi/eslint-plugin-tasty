---
'@tenphi/eslint-plugin-tasty': minor
---

Add the `no-state-in-selector` warning to recommended and strict presets. It
reports pseudo-class and attribute conditions in sub-element `$` selectors so
authors can move those conditions into property state maps. Structural grouping,
pseudo-elements, and exact `data-element` identities remain supported. The rule
is report-only to avoid changing selector scope or defaults automatically.
