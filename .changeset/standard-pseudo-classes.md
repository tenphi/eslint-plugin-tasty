---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-state-key` accepts every standard CSS pseudo-class, including functional ones. Keys such as `:dir(rtl)`, `:lang(en)`, `:popover-open`, `:open`, `:modal`, `:user-invalid`, `:state(checked)` and `@own(:popover-open)` were reported as unknown, even though Tasty compiles them correctly. The known list now covers every standard pseudo-class in MDN's browser-compat-data, plus the Selectors Level 4 ones it does not list yet. Misspelled pseudo-classes are still reported.
