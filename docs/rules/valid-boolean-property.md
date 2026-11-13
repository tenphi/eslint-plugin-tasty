# tasty/valid-boolean-property

Reports `true` on a property that has no default to apply, such as `textAlign: true` or `fill: true`. `false` is valid everywhere.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

On a property with a design-system default, `true` means "use the default": `padding: true` is `1x`, `border: true` is `1bw`. On any other property, Tasty passes `true` through, and the browser drops the declaration.

## Examples

```js
// ✅ Valid
border: true
radius: true
padding: true
padding: false // false removes the property, on any property

// ❌ Property 'textAlign' does not accept boolean true.
textAlign: true

// ❌ The same check applies inside a state map
fill: { '': '#surface', hovered: true }
```

## Properties that take `true`

`border`, `radius`, `padding`, `margin`, `inset`, `gap`, `color`, `fade`, `outline`, `shadow`, `width`, `height`, `hide`, `preset`, `font`, `scrollbar`, `scrollMargin`, `scrollPadding`, and the enhanced logical styles (`blockSize`, `inlinePadding`, `blockBorder`, …). Each one carries its category's default: `1x` for spacing and scroll edges, `0` for inset, `1bw` for border, a reset for the sizes.

Left out on purpose:

- `fill`, though the Tasty docs list it. As of Tasty 3.8 the handler passes the boolean through, so `fill: true` emits `background-color: true`: the browser drops it and the element has no background. A canary in `constants.round-trip.test.ts` fails when Tasty changes this.
- `minWidth`, `maxWidth`, `minHeight`, `maxHeight` and the logical `minBlockSize` and the like. Tasty accepts `true` there but resets the whole axis rather than the one constraint named. Write `width: true` or `blockSize: true` to ask for that.
- Native logical CSS such as `paddingInlineStart`, which has no category default.

## Options

None.
