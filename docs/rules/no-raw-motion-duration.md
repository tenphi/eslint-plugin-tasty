# tasty/no-raw-motion-duration

Reports a hardcoded duration in `animation`, `animationDuration` and `transitionDuration`, such as `'spin 2s linear infinite'`. Use a duration token instead.

**Presets:** none. Turn it on in your config. **Fix:** editor suggestions.

## Why

When a design system keeps its animation timing in tokens, a raw `2s` drifts from it. This rule extends [`tasty/no-raw-transition-duration`](no-raw-transition-duration.md) to the CSS animation and duration properties. It is opt-in because not every design system has motion tokens.

## Examples

```js
// ❌ animation duration '2s' is hardcoded. Use a duration token.
animation: 'spin 2s linear infinite'

// ❌ transitionDuration duration '150ms' is hardcoded. Use a duration token.
transitionDuration: '150ms'

// ✅ A token
animationDuration: '$fast-duration'

// ✅ A delay: the second time in an animation shorthand
animation: 'spin $spin-duration linear 2s'
```

## Checks

- The duration in `animation`, and the values of `animationDuration` and `transitionDuration`, in Tasty style objects and JSX style props.
- A second time in an animation shorthand is a delay and is left alone.
- Zero and token-based timing are fine.

The editor suggests each configured duration token whose name fits the property, such as a `$…duration` token. It never suggests removing the duration: unlike Tasty's `transition`, these CSS properties have no Tasty timing to fall back to.

Lengths and other numbers are outside this rule. [`tasty/consistent-token-usage`](consistent-token-usage.md) covers pixel lengths.

## Turning it on

```js
import tasty from '@tenphi/eslint-plugin-tasty';

export default [
  tasty.configs.recommended,
  { rules: { 'tasty/no-raw-motion-duration': 'warn' } },
];
```

## Options

None.
