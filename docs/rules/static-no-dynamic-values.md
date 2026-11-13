# tasty/static-no-dynamic-values

Reports a value in a `tastyStatic()` call that is not a literal: variables, templates with expressions, calls, spreads and other expressions.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

The Babel plugin turns `tastyStatic()` into CSS at build time. It cannot evaluate JavaScript, so a dynamic value fails the build. This is a stricter, build-time version of [`tasty/no-runtime-styles-mutation`](no-runtime-styles-mutation.md).

## Examples

```js
// ❌ tastyStatic() values must be static.
const size = '2x';
tastyStatic({ padding: size });

// ❌ tastyStatic() values must be static.
tastyStatic({ padding: `${base}x` });

// ✅ Valid
tastyStatic({ padding: '2x' });
tastyStatic({ padding: { '': '2x', '@mobile': '1x' } });
```

## Checks

Every value must be a string, number, boolean or `null`, or an object or array of those (state maps, sub-elements). Variables, templates with expressions, calls, spreads and other expressions are reported.

## Options

None.
