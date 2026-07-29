---
'@tenphi/eslint-plugin-tasty': patch
---

Fix `valid-value` rejecting the `dock` modifier that `prefer-directional-shorthand` auto-fixes to.

0.11.0 taught the fixer to emit `inset: '0 bottom dock'` but did not add `dock` to `inset`'s modifier allowlist, so running `eslint --fix` turned a warning into an error:

```
error tasty(valid-value): Modifier 'dock' is not valid for 'inset'.
                          Accepted: top, right, bottom, left.
```

`dock` is now accepted for `inset` (and only `inset`) by both `valid-value` and `valid-directional-modifier`.

Added an integration test that applies `prefer-directional-shorthand`'s fixes and re-lints the output against the whole `recommended` set, so a fix that emits a token the validation rules do not know about fails the suite instead of shipping.
