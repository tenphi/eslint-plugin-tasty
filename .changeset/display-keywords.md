---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-value` accepts every CSS `display` keyword. Its list stopped at 13 values, so `grid-lanes` (CSS masonry), `flow-root`, `inline-table`, the rest of the table and ruby families, and the two-value syntax (`block flex`, `inline flow-root`, `list-item block`) were reported as invalid modifiers. The list now covers the outside, inside, list-item, internal, box and legacy keywords of CSS Display, plus `grid-lanes` / `inline-grid-lanes`. A misspelled keyword is still reported.
