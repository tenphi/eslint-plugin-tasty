---
'@tenphi/eslint-plugin-tasty': minor
---

Warn about `style`, `className`, and `styles` props on recognized Tasty components
in both presets. New `no-style-prop` and `no-classname-prop` rules recommend tokens
and sub-element `data-element` identities; `no-styles-prop` now also checks dynamic
values and recommends tokens, mods, exposed props/variants, or a styled wrapper.
All three cover explicit props and inline object spreads, with import-aware,
shadow-aware detection and report-only migration guidance.

Clarify intentional exceptions in prop and related advisory warnings, including
third-party styling integration and edge-case instance overrides. Recommend
explicit local ESLint ignores with reasons and document their scope.
