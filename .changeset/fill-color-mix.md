---
'@tenphi/eslint-plugin-tasty': minor
---

Add `tasty/prefer-fill-mix` (recommended, warn). It reports the deprecated space-separated two-color `fill` and `backgroundColor` (`'#surface #dark.04'`) and autofixes it to Tasty's comma mix (`'#dark 4%, #surface'`) when the overlay's opacity is written on it; `'#base #clear'` becomes `'#base'`. It also reports a mix part weighted by its opacity (`'#dark.04, #surface'`) with an editor suggestion. The rule is inactive unless `@tenphi/tasty` 3.15.0 or later is installed.
