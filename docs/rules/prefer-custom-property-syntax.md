# tasty/prefer-custom-property-syntax

Reports raw CSS where Tasty has a token: `var(--name)`, a `$name-color` reference, `transparent` and `currentColor`.

**Presets:** warning in recommended and strict. **Fix:** autofix.

## Why

Tasty's token syntax is shorter and checked: [`tasty/valid-color-token`](valid-color-token.md) and [`tasty/valid-custom-property`](valid-custom-property.md) catch a misspelled `#name` or `$name`, but not a misspelled `var(--name)`.

## Examples

```js
// ❌ Use Tasty token syntax '$gap' instead of 'var(--gap)'.
padding: 'var(--gap)'

// ❌ Use Tasty token syntax '#accent' instead of 'var(--accent-color)'.
fill: 'var(--accent-color)'

// ❌ Use color token '#text' instead of custom property reference '$text-color'.
color: '$text-color'

// ❌ Use the '#clear' token instead of the 'transparent' keyword.
border: '1bw solid transparent'

// ❌ Use the '#current' token instead of the 'currentColor' keyword.
outline: 'currentColor'

// ✅ After the autofix
padding: '$gap'
fill: '#accent'
color: '#text'
border: '1bw solid #clear'
outline: '#current'
```

## Autofix

| Before | After |
| --- | --- |
| `var(--name)` | `$name` |
| `var(--name-color)` | `#name` |
| `var(--name, fallback)` | `($name, fallback)` |
| `$name-color`, `$name-color.5` | `#name`, `#name.5` |
| `transparent` | `#clear` |
| `currentColor` | `#current` |

Every fix renders the same CSS. Tasty expands `#name` only in properties that take colors, so the rule stays quiet where a color token would not expand, such as `var(--accent-color)` in `fontSize`.

## Where it applies

Values in Tasty style objects, and style props of components known to be Tasty components. It skips the values of `$name` and `#name` keys, which define tokens.

## Options

None.
