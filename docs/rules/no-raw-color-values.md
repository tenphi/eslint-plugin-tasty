# tasty/no-raw-color-values

Reports raw colors in style values: hex colors, color functions such as `rgb()` or `okhsl()`, and named colors such as `red`. Use a color token instead.

**Presets:** warning in recommended and strict. **Fix:** none.

## Why

A design system owns its colors in one place. A raw color skips the palette, so it does not follow themes, dark mode or high contrast, and it drifts from the tokens over time.

## Examples

```js
// ❌ Use a color token instead of raw hex color '#ff0000'.
fill: '#ff0000'

// ❌ Use a color token instead of raw rgb() color.
color: 'rgb(0 0 0)'

// ❌ Use a color token instead of raw named color 'red'.
border: '1bw solid red'

// ✅ A token
fill: '#danger'

// ✅ A token definition may hold a raw color
'#accent': '#ff0000'
```

## Checks

1. **Hex colors:** `#` followed by 3, 4, 6 or 8 hex digits. A token name made only of those characters (`#add`, `#beef`) reads as a hex color too.
2. **Color functions:** `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `okhsl()`, `okhsv()`, `okhst()`, `color()`, `device-cmyk()` and `light-dark()`.
3. **Named colors** (`red`, `rebeccapurple`, …) in properties that take colors. `transparent` and `currentColor` are left to [`tasty/prefer-custom-property-syntax`](prefer-custom-property-syntax.md), which suggests `#clear` and `#current`.

Not reported: values of `#name` and `$name` keys, which define tokens, values inside `tastyStatic(':root', { … })`, quoted strings and URLs.

## Exceptions

For an intentional one-off color, disable the rule for that line, with a reason:

```js
// eslint-disable-next-line tasty/no-raw-color-values -- brand color from the partner's guidelines
fill: '#1db954',
```

## Options

None.
