---
'@tenphi/eslint-plugin-tasty': patch
---

Object arguments of `mergeStyles(...)` imported from a Tasty import source are linted as style objects. `no-style-spread` recommends `mergeStyles` for composition, but following that advice took the overrides out of every rule: unknown tokens, misspelled properties and spreads inside the arguments all passed. The first argument is checked as a base style object; each later one as a partial override, so a state map without `''` there extends the one below it and `require-default-state` stays quiet, as `mergeStyles` merges it. A `styleFunctions.mergeStyles` entry in a tasty config is now superseded by this built-in signature.
