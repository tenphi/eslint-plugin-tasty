---
'@tenphi/eslint-plugin-tasty': patch
---

Accept the `longhand` output modifier on box properties in `valid-value`.

`longhand` forces a box property to emit the individual CSS longhands instead of the shorthand, so children can selectively inherit a single side or corner (`radius: 'inherit right'`). It is documented for `padding`, `margin`, `inset`, `border` and `radius`, and honoured by the corresponding style handlers — but it was missing from every `acceptsMods` list in `PROPERTY_EXPECTATIONS`, so `valid-value` rejected the documented syntax as an error:

```
error tasty(valid-value): Modifier 'longhand' is not valid for 'radius'.
                          Accepted: top, right, bottom, left, top-left, …
```

`longhand` is now accepted on those five properties. `fade` and `outline` are unchanged — neither style handler reads the modifier.

Added valid-case coverage for all five properties to `valid-value.test.ts`.
