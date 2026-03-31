---
"@tenphi/eslint-plugin-tasty": minor
---

Cascading config resolution and false-positive fixes.

- Config files (`tasty.config.ts`) are now merged from all directories between the linted file and the project root, with nearest having the highest priority. This enables per-directory config overrides without duplicating parent settings.
- The `@tenphi/tasty` package config is auto-discovered from `node_modules` and used as the implicit base layer. Explicit `extends: '@tenphi/tasty'` is no longer needed.
- Added missing CSS properties to the known set: all `scrollMargin*` and `scrollPadding*` directional variants, and `textSizeAdjust`.
- Added grid layout properties (`gridArea`, `gridColumn`, `gridRow`, and their start/end variants) to the skip list since they accept arbitrary named identifiers.
- Fixed false-positive `unknownToken` reports for passthrough properties (e.g., `textOverflow: 'ellipsis'`).
