# tasty/prefer-state-negation

Reports a top-level `:not(...)` in a state key. Tasty's `!` prefix says the same thing.

**Presets:** warning in recommended and strict. **Fix:** autofix.

## Why

`!` is Tasty's negation operator. It works on every kind of state: modifiers, attributes, pseudo-classes and aliases. One spelling for negation keeps state maps easy to read.

## Examples

```js
// ❌ Use the '!' prefix instead of top-level :not() in state keys.
fill: { '': '#white', ':not(:hover)': '#blue' }

// ✅ After the autofix
fill: { '': '#white', '!:hover': '#blue' }
```

## Autofix

| Before | After |
| --- | --- |
| `':not(:hover)'` | `'!:hover'` |
| `':not(:nth-child(2n + 1))'` | `'!:nth-child(2n + 1)'` |
| `':not(.active)'`, `':not([data-kind="x"])'` | `'!:is(.active)'`, `'!:is([data-kind="x"])'` |
| `':not(:hover, :focus)'` | `'!:is(:hover, :focus)'` |
| `'hovered & (:not(:hover) \| :not(:focus))'` | `'hovered & (!:hover \| !:focus)'` |

Anything but a single known pseudo-class is wrapped in `:is(...)`, so it keeps its meaning.

The rule reports without a fix when the key has JavaScript escapes, when the new key already exists in the map, or when the map has a spread or a computed key that could hold it.

## Not reported

- `:not()` nested inside another selector: `':has(~ :not([data-drop-indicator]))'`, `':is(:not(:hover), :focus)'`.
- `:not()` inside `@parent(...)`, `@root(...)` or `@own(...)`.
- Malformed keys, which [`tasty/valid-state-key`](valid-state-key.md) reports.
- Selector arguments, such as `tastyStatic(':not(:hover)', …)`.

## Options

None.
