---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-transition` no longer splits a transition on commas inside a timing function. `'visibility .5s steps(2, start)'` reported `start)` as an unknown transition name, and `cubic-bezier(0.5, 0.05, 0.3, 0.95)` reported each argument after the first. Commas inside parentheses or quotes now stay in their transition, and the suggestions for later transitions in the list point at the right text.
