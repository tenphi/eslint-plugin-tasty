# tasty/no-raw-color-values

Reports raw colors in style values and in the color attributes of SVG and other native elements: hex colors, color functions such as `rgb()` or `okhsl()`, and named colors such as `red`. Use a color token instead.

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

## SVG attributes

A raw color in an attribute of a native element (a lowercase JSX tag) skips the palette the same way. The rule checks `fill`, `stroke`, `color`, `stopColor`, `floodColor` and `lightingColor`, and their kebab-case spellings (`stop-color`, `flood-color`, `lighting-color`), with the three checks above.

To theme an SVG, write `currentColor` in the attribute and set the color from a token in Tasty styles: `color: '#token'` on the SVG or a parent. Or set `svgFill` and `stroke` in Tasty styles.

```jsx
// ❌ Raw color '#fff' in the stroke attribute does not follow the theme.
<circle r="11" stroke="#fff" />

// ❌ Raw color 'rgb()' in the fill attribute does not follow the theme.
<svg fill="rgb(255 0 0)" />

// ✅ currentColor, with the color from a token on a Tasty parent
const Ring = tasty({ as: 'svg', styles: { color: '#surface' } });
<Ring><circle r="11" stroke="currentColor" /></Ring>

// ✅ Tasty styles on the SVG
const Mark = tasty({ as: 'svg', styles: { svgFill: '#current', stroke: '#danger-text' } });
```

Only literal values are checked: a string, `{'…'}`, or a template literal with no substitutions. Not reported:

- `none`, `currentColor` in any case, `transparent`, `inherit`, `context-fill` and `context-stroke`.
- `url(#…)` and `var(--…)`.
- A dynamic value, such as `fill={color}`.
- Anything inside `<clipPath>` or `<mask>`, where a fill is geometry or luminance, not a theme color.
- Props of components (capitalized and member tags). A Tasty component's style props are checked as style values. A third-party component's props, such as `<CartesianGrid stroke>`, are not style props and stay unchecked.

## Exceptions

For an intentional one-off color, disable the rule for that line, with a reason:

```js
// eslint-disable-next-line tasty/no-raw-color-values -- brand color from the partner's guidelines
fill: '#1db954',
```

With Oxlint, `// oxlint-disable-next-line` works the same way. Fixed artwork in an SVG attribute, such as a third-party logo, takes the same reasoned disable:

```jsx
{/* eslint-disable-next-line tasty/no-raw-color-values -- file-type logo from Material Icon Theme */}
<path fill="#42a5f5" d="M0 0h24v24H0z" />
```

## Options

None.
