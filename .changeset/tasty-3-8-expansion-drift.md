---
'@tenphi/eslint-plugin-tasty': patch
---

Stop suppressing correct `$name` rewrites in `prefer-custom-property-syntax`.

The rule held back a `var(--x)` → `$x` rewrite for two dozen properties whose handlers
used to pass the value through verbatim, which would have emitted an invalid
`font-family: $font-sans`. Tasty **3.0.2** taught those handlers to substitute `$name`
refs (tasty#264), so the suppression list has been stale for eight releases — the
plugin's own round-trip guard, which re-derives it from the installed runtime, caught
this on the bump to 3.8.0. `fontFamily`, `fill`, `color` and the rest now get the
rewrite.

The `@tenphi/tasty` peer range floor moves from `>=3` to `>=3.0.2` accordingly: on
3.0.0/3.0.1 the rewrite this unlocks would delete a declaration.
