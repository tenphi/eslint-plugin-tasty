# tasty/static-valid-selector

Reports an invalid selector in `tastyStatic(selector, styles)`: an empty string, unbalanced brackets, or a selector that is not a string literal.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

The Babel plugin reads the selector at build time. It cannot evaluate a variable, and a broken selector produces CSS the browser drops.

## Examples

```js
// ✅ Valid
tastyStatic('body', { fill: '#dark' });
tastyStatic('.heading', { preset: 'h1' });
tastyStatic(':root', { $gap: '8px' });

// ❌ Invalid CSS selector: Selector cannot be empty
tastyStatic('', { fill: '#dark' });

// ❌ Invalid CSS selector: Unbalanced brackets in selector
tastyStatic('.card[', { fill: '#dark' });

// ❌ tastyStatic() selector must be a string literal.
tastyStatic(getSelector(), { fill: '#dark' });
```

## Checks

1. The selector is a string literal.
2. Basic syntax: not empty, balanced brackets, valid characters. Tag names, `.class`, `#id`, `:pseudo`, `[attr]` and combinators are always valid.

## Options

None.
