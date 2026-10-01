---
'@tenphi/eslint-plugin-tasty': minor
---

Add `prefer-state-negation`, enabled as a warning in the recommended and strict presets. Autofix top-level `:not(...)` state keys to the `!` prefix while preserving nested selectors and wrapping selector lists or compounds in `!:is(...)`.
