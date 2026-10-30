---
'@tenphi/eslint-plugin-tasty': minor
---

`tasty/prefer-fill-mix` now fixes two-color fills to compound colors when `@tenphi/tasty` 3.16 or later is installed. A space-separated fill gets a `+` where the space was (`'#surface #dark.04'` becomes `'#surface+#dark.04'`), and a comma mix, which Tasty deprecates in favor of compound colors, is fixed to the same color: `'#dark 4%, #surface'` becomes `'#surface+#dark.04'`, and a mix a compound can't write, such as one weighted by a custom property, becomes `color-mix(in srgb, …)` with the same parts. A comma mix of three or more colors is reported without a fix, and a translucent part without a percentage gets a compound as an editor suggestion. With Tasty 3.15 the rule works as before, except that a faded color opposite a weighted one (`'#dark 4%, #surface.5'`) is no longer reported: it is the base the other color is painted over.

The value parser now reads a compound color as one color token, so `valid-value` no longer reports a faded base or a third layer (`'#surface.5+#dark.04'`, `'#surface+#accent.1+#dark.04'`) as an invalid opacity. A `+` joining a color token to anything else, such as `'#surface+1x'`, is reported, because Tasty drops it.
