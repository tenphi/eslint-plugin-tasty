# tasty/valid-color-token

Reports a color token with invalid syntax, such as `#purple.-5`, and a color token that your config does not list.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Tasty turns `#name` into `var(--name-color)`. A token that no one defines resolves to nothing, and the browser drops the declaration without an error.

## Examples

```js
// ❌ Invalid color token '#purple.-5': Opacity cannot be negative.
fill: '#purple.-5'

// ❌ Unknown color token '#pruple' (with tokens listed in tasty.config)
fill: '#pruple'

// ✅ Valid
fill: '#purple'
fill: '#purple.5'
```

## Syntax

Always checked.

| Valid | Meaning |
| --- | --- |
| `#purple` | Full opacity |
| `#purple.5` | 50% opacity |
| `#purple.05` | 5% opacity |
| `#purple.100` | 10% opacity, the same as `#purple.1` |
| `#purple.999` | 99.9% opacity |
| `#current`, `#current.5` | `currentcolor`, at full or 50% opacity |
| `##purple` | The raw `--purple-color` reference, for transitions and `@property` |
| `(#primary, #secondary)` | A fallback |
| `#name.$prop` | Opacity from a custom property |

The digits after the dot are a decimal fraction, so any digit string is in range.

| Invalid | Why |
| --- | --- |
| `#` | Empty token name |
| `#purple.` | Trailing dot with no opacity value |
| `#purple.5.5` | The opacity is not a digit string |
| `#purple.-5` | Negative opacity |

Raw hex colors such as `#ff0000` are not tokens. [`tasty/no-raw-color-values`](no-raw-color-values.md) reports them.

## Existence

Checked only when `tokens` in `tasty.config.*` lists names. A token is known when it is:

- one of Tasty's built-in color tokens: `#current`, `#clear`, `#white`, `#black`, `#border`, `#outline`, with or without an opacity;
- listed in `tokens`;
- defined as a `#name` key in any style object of the same file, such as a sibling `'#accent': '#purple'` or a key in `tastyStatic(':root', { … })`.

`##name` is checked the same way as `#name`. `tokens: false` turns the existence check off, also when an extended config lists tokens.

## Options

None.
