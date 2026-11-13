# tasty/valid-state-definition

Reports an invalid state alias definition in `configure({ states })`: a key without `@`, or a value that is not a valid state expression.

**Presets:** warning in strict. **Fix:** none.

## Why

Every style that uses an alias gets its definition. A broken definition breaks each of those states at once.

## Examples

```js
// ✅ Valid
configure({
  states: {
    '@mobile': '@media(w < 768px)',
    '@dark': '@root(theme=dark)',
  },
});

// ❌ Empty @media() query.
configure({
  states: {
    '@mobile': '@media()',
  },
});

// ❌ State alias 'mobile' must start with '@'.
configure({
  states: {
    mobile: '@media(w < 768px)',
  },
});
```

## Checks

1. An alias key starts with `@`.
2. Its value parses as a state expression, with the same parser as [`tasty/valid-state-key`](valid-state-key.md).

The rule reads `configure()` calls imported from Tasty.

## Options

None.
