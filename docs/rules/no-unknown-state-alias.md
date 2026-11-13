# tasty/no-unknown-state-alias

Reports an `@name` state alias that is not in your config, not defined locally and not built in, wherever it appears in a state key.

**Presets:** warning in strict. **Fix:** none.

## Why

Tasty cannot expand an alias it does not know, so the state never applies. A typo such as `@drak` fails silently.

## Examples

```js
// ❌ Unknown state alias '@drak'. Add it to 'states' in your tasty config, or define it locally as a '@name' key.
padding: { '': '4x', '@drak': '2x' }

// ❌ The same alias inside a compound key
padding: { '': '4x', 'hovered & @drak': '2x' }

// ✅ A local alias
tasty({
  styles: {
    '@compact': 'size=small',
    padding: { '': '4x', '@compact': '2x' },
  },
});
```

## Checks

Compound keys are parsed, so each alias is checked wherever it appears: `'@dark | hovered'`, `'hovered & @dark'`, `'(@dark | hovered)'`, `'@root(@dark)'`.

An alias is known when it is:

- listed in `states` in `tasty.config.*`;
- a local alias: an `@name: '<state>'` key of the object, or of an enclosing sub-element up to the root. A `mergeStyles(...)` argument stands for the merged object, so aliases from every object argument count, and a `mergeStyles` call used as a sub-element value also sees the styles around it;
- built in: `@media`, `@root`, `@parent`, `@own`, `@supports`, `@starting`, and the `@(` container query syntax.

Without `states` in the config and no local aliases in view, the rule does nothing.

[`tasty/valid-state-key`](valid-state-key.md), in the recommended preset, reports an unknown alias too when `states` is set.

## Options

None.
