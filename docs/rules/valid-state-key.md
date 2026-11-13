# tasty/valid-state-key

Reports a state key that does not parse, such as `'hovered &'` or `':hovr'`, a misused `_` fallback floor, and an `@alias` your config does not list.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Tasty skips a state key it cannot parse, so the value under it never applies. Nothing reports it at runtime.

## Examples

```js
// ✅ Valid
fill: { '': '#white', hovered: '#gray.05' }
fill: { '': '#white', ':hover': '#gray.05' }
fill: { '': '#white', '@mobile': '#gray' }

// ✅ A standalone '_' fallback floor
inset: { _: 'auto', '@(scroll-state(stuck: top))': '0 auto auto auto' }

// ✅ The '_' floor and the '' default together
fill: { _: '#white', '': '#gray', hovered: '#blue' }

// ❌ Expected expression after '&' operator.
fill: { '': '#white', 'hovered &': '#gray' }

// ❌ Unknown pseudo-class ':hovr'.
fill: { '': '#white', ':hovr': '#gray' }

// ❌ Unknown state alias '@mobil'. Configured aliases: @mobile.
fill: { '': '#white', '@mobil': '#gray' }

// ❌ The fallback floor "_" cannot be combined with other state logic.
fill: { '': '#white', '_ & hovered': '#blue' }
```

## Valid state keys

- `''`: the default, the lowest priority among states.
- `_`: the fallback floor, standalone only.
- A modifier: `hovered`, `pressed`, `disabled`.
- A value modifier: `theme=danger`, `size=large`, `size^=sm`, with `=`, `^=`, `$=` or `*=`.
- A pseudo-class: any standard CSS pseudo-class, such as `:hover`, `:focus-visible`, `:popover-open`, `:nth-child(2n+1)` or `:dir(rtl)`.
- A class or an attribute: `.active`, `[aria-expanded="true"]`, `[data-mode]`.
- Combinations: `hovered & .active`, `!disabled`, `(loading | processing) & !readonly`, with `&`, `|`, `^` and `!`.
- Advanced states: `@media(...)`, `@root(...)`, `@parent(...)`, `@(...)` container queries, `@own(...)`, `@starting`, `@supports(...)`.
- Aliases: `@mobile`, `@dark` and others from `states` in `tasty.config.*` or local `@name` keys.

## Checks

1. **Syntax.** Operators, balanced parentheses, known pseudo-classes, and the dimension shorthands (`w`, `h`, `is`, `bs`) inside `@media(...)` and `@(...)`.
2. **Aliases.** When `states` in `tasty.config.*` lists aliases, every `@name` must be one of them or a local alias. [`tasty/no-unknown-state-alias`](no-unknown-state-alias.md) does the same with more context, in the strict preset.
3. **Fallback floor.** `_` stands alone. Combined with other state logic (`_ & hovered`, `_ | loading`), Tasty ignores the key.

## The `_` fallback floor

A standalone `_` key is a fallback for the whole map. Its value always applies, and states with higher priority layer over it through the cascade. It covers the case where a negated `@supports(...)` or container-query default would otherwise never apply, which leaves no rule active. `_` can sit next to `''`: one is the always-on floor, the other the negated default.

## Options

None.
