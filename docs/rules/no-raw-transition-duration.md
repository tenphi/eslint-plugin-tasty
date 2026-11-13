# tasty/no-raw-transition-duration

Reports a hardcoded duration in a `transition` value, such as `'fill 0.2s'`. Use a duration token, or leave the duration out to get the design system's timing.

**Presets:** warning in recommended and strict. **Fix:** editor suggestions.

## Why

A design system that owns its motion timing owns it in one place. A `0.2s` sprinkled through components drifts the same way a raw hex color does. Without a duration, Tasty uses `var(--<name>-transition, var(--transition))`, so the timing follows the design system.

## Examples

```js
// ❌ Transition duration '0.2s' is hardcoded. Use a duration token ($transition),
//    or omit it to inherit $fill-transition (falling back to $transition).
transition: 'fill 0.2s'

// ❌ Transition duration '(0.2s * 2)' contains a hardcoded time.
transition: 'fill (0.2s * 2)'

// ✅ A token
transition: 'fill $transition'

// ✅ No duration: Tasty uses the per-name timing
transition: 'fill'
transition: 'fill ease-in'

// ✅ A delay, not a duration
transition: 'fill ease-in 0.1s'

// ✅ Zero turns the motion off
transition: 'fill 0s'
```

## Checks

The rule checks only the **duration**: the second word of each comma group, when it is not an easing. A Tasty transition is `[name] [duration] [easing] [delay]` or `[name] [easing] [delay]`, so a later time is a delay and is left alone. Leaving out a delay means "no delay", a real change, while leaving out a duration falls back to the design system's timing.

Hardcoded means a nonzero CSS time (`0.2s`, `200ms`, `.15s`), or an expression with a raw time and no token, such as `(0.2s * 2)`. Tokens and expressions built on them are fine: `$transition`, `var(--transition)`, `calc(var(--transition) * 2)`.

The rule also checks the `transition` JSX prop of a local `const` component created by an imported `tasty()` call. Other components' props are not assumed to use Tasty's transition syntax.

## Suggestions

For a literal duration, the editor offers:

1. each duration token in the project config: a `tokens` entry named `$transition`, ending in `-transition`, or containing `duration`;
2. removing the duration, to inherit `var(--<name>-transition, var(--transition))`.

Neither is an autofix: both change what the browser renders. An expression with a raw time gets no suggestion, since replacing or removing it may change what it computes.

`@tenphi/tasty` ships a `tasty.config.ts` that lists `$transition`, and the plugin reads it as the base of the config chain, so there is always at least one token to suggest.

## Options

None.
