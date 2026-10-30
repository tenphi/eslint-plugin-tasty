# tasty/prefer-fill-mix

Replace deprecated two-color fills with compound colors, and catch mix parts
that are weighted by their opacity. The recommended and strict presets enable
this rule as a warning.

Tasty 3.16 layers color tokens with `+`: `'#surface+#dark.04'` paints `#dark` at
4% over `#surface` as one color,
`color-mix(in srgb, var(--dark-color) 4%, var(--surface-color))`, in any color
slot. It replaces both older ways to put two colors in a `fill` (or
`backgroundColor`):

- `'#surface #dark.04'` paints the second color as a `background-image` layer,
  which contrast checkers such as axe-core cannot see through. Deprecated in
  Tasty 3.15.
- `'#dark 4%, #surface'` mixes the colors as the arguments of `color-mix()`. It
  is the same color as the compound, but only in `fill`. Deprecated in Tasty
  3.17.

```js
// Before
const Item = tasty({
  styles: {
    fill: {
      '': '#surface #clear',
      hovered: '#surface #dark.04',
      pressed: '#dark 8%, #surface',
    },
  },
});

// After autofix
const Item = tasty({
  styles: {
    fill: {
      '': '#surface',
      hovered: '#surface+#dark.04',
      pressed: '#surface+#dark.08',
    },
  },
});
```

The rule's name predates compound colors: it covers every two-color fill.

## Autofixes

| Before | After |
|--------|-------|
| `'#base #tok.N'` | `'#base+#tok.N'` |
| `'#base #clear'`, `'#base #tok.0'` | `'#base'` |
| `'#tok N%, #base'`, `'#base, #tok N%'` | `'#base+#tok.N'` |
| `'#tok ($prop * 100%), #base'` | `'#base+#tok.$prop'` |
| `'#tok 0%, #base'` / `'#tok 100%, #base'` | `'#base'` / `'#tok'` |
| any other two-color mix | `'color-mix(in srgb, <the same parts>)'` |

`#base` can be faded, or a compound itself: `'#accent 10%, #surface+#dark.04'`
becomes `'#surface+#dark.04+#accent.1'`. A weight becomes the opacity the way
Tasty reads it, as a decimal fraction: `4%` is `.04`, `4.5%` is `.045`, `30%` is
`.3`. A base a compound cannot take, such as `rgb(…)`, is mixed in `color-mix()`
itself.

Every comma-mix fix is the same color as the mix: a compound compiles to the
same `color-mix()`. That includes a weight from a custom property, such as
`'#tok $weight, #base'`, which becomes
`'color-mix(in srgb, #tok $weight, #base)'`: a compound's `$prop` opacity has to
hold a number (`.04`), not a percentage (`4%`), so to use one, change what the
property holds and write `'#base+#tok.$alpha'`. A weighted `#clear` stays a
`color-mix()` too: a compound leaves a transparent layer out, while the mix lets
it thin out the other color.

A space-separated fix renders the same color as the layer when the overlay token
holds an opaque color. Drawing an opaque color at alpha `a` over the base is the
compound, also when the base is translucent. If `#tok` itself holds a
translucent color, the compound differs from the layer; give such a token an
opaque color and put its alpha in the suffix.

## Reported without a fix

When the overlay's alpha is not written on it, the rule cannot tell what the
layer painted, so it only reports:

- an overlay token with no opacity, such as `'#surface #primary-accent-surface'`.
  If the token is opaque, it covered the base completely: use it alone. If it
  holds a translucent color, split it into an opaque color and an opacity:
  `'#base+#overlay.$overlay-alpha'`.
- a literal overlay such as `rgb(0 0 0 / .1)`;
- three or more space-separated colors.

A comma mix of three or more colors is reported too: Tasty mixes only the first
two.

## Translucent mix parts

When neither part of a comma mix has a percentage, each takes half, so a part
with an opacity is weighed down twice, by its share of the mix and by its own
alpha, and the background comes out see-through: `'#dark.04, #surface'` is 52%
opaque, not `#dark` at 4% over `#surface`. The rule reports it with an editor
suggestion, `'#surface+#dark.04'` (or the other color alone for `#clear`). It is
not an autofix, because the rewrite changes what renders. Opposite a part with a
percentage, a faded part is the base the other is painted over, and the mix is
exact: `'#dark 4%, #surface.5'` is fixed to `'#surface.5+#dark.04'`.

## Tasty version

The rule does nothing unless the project has `@tenphi/tasty` 3.15.0 or later
installed: an older Tasty renders only the first color of a two-color fill, so a
fix would break it.

With Tasty 3.15, which has no compound colors, the rule fixes the
space-separated form to a comma mix (`'#base #tok.N'` to `'#tok N%, #base'`),
leaves comma mixes alone, and suggests a weight for a translucent part
(`'#dark 4%, #surface'`). Once the project is on 3.16, the next run fixes those
comma mixes to compound colors.
