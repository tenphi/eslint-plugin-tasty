# tasty/prefer-fill-mix

Replace deprecated space-separated two-color fills with a comma mix, and catch
mix parts that are weighted by their opacity. The recommended and strict presets
enable this rule as a warning.

Tasty 3.15 mixes two comma-separated `fill` (or `backgroundColor`) colors into
one `background-color`: `'#dark 4%, #surface'` compiles to
`color-mix(in srgb, var(--dark-color) 4%, var(--surface-color))`. The older
`'#surface #dark.04'` form paints the second color as a `background-image` layer,
which contrast checkers such as axe-core cannot see through, and is deprecated.

```js
// Before
const Item = tasty({
  styles: {
    fill: { '': '#surface #clear', hovered: '#surface #dark.04' },
  },
});

// After autofix
const Item = tasty({
  styles: {
    fill: { '': '#surface', hovered: '#dark 4%, #surface' },
  },
});
```

## Autofixes

| Before | After |
|--------|-------|
| `'#base #tok.N'` | `'#tok N%, #base'` |
| `'#base #tok.$prop'` | `'#tok ($prop * 100%), #base'` |
| `'#base #clear'`, `'#base #tok.0'` | `'#base'` |

The opacity becomes the weight the way Tasty reads it, as a decimal fraction:
`.04` is `4%`, `.5` is `50%`, `.100` is `10%`.

The fix renders the same color as the layer when the overlay token holds an
opaque color. Drawing an opaque color at alpha `a` over the base is the base
mixed with it at weight `a` in sRGB, also when the base is translucent. If
`#tok` itself holds a translucent color, the mixed result differs from the
layer; give such a token an opaque color and put its alpha in the weight.

## Reported without a fix

When the overlay's alpha is not written on it, the rule cannot tell what the
layer painted, so it only reports:

- an overlay token with no opacity, such as `'#surface #primary-accent-surface'`.
  If the token is opaque, it covered the base completely: use it alone. If it
  holds a translucent color, split it into an opaque color and a weight:
  `'#overlay $overlay-weight, #base'`.
- a literal overlay such as `rgb(0 0 0 / .1)`;
- three or more colors.

## Translucent mix parts

A mix part with an opacity but no percentage is weighed down twice, by its share
of the mix and by its own alpha, so the background comes out see-through:
`'#dark.04, #surface'` is 52% opaque, not `#dark` at 4% over `#surface`. The
rule reports it with an editor suggestion, `'#dark 4%, #surface'` (or the other
color alone for `#clear`). It is not an autofix, because the rewrite changes
what renders.

## Tasty version

The rule does nothing unless the project has `@tenphi/tasty` 3.15.0 or later
installed: an older Tasty renders only the first color of a comma mix, so the
fix would break the fill.
