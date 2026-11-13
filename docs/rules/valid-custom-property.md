# tasty/valid-custom-property

Reports a `$name` custom property reference with invalid syntax, and one that nothing defines.

**Presets:** warning in strict. **Fix:** none.

## Why

Tasty turns `$name` into `var(--name)`. A misspelled name resolves to nothing, and the declaration is dropped without an error.

## Examples

```js
// ✅ Valid
padding: '$spacing'
transition: '$$gradient-angle 0.3s'

// ❌ Unknown custom property '$spacign'
padding: '$spacign'
```

## Checks

1. **Syntax.** A name is `$` followed by letters, digits or hyphens, such as `$accent-color`. The fallback form `($name, fallback)` is checked too.
2. **Existence.** Checked only when `tokens` in `tasty.config.*` lists names. A property is known when it is:
   - one of Tasty's built-in custom properties: `$gap`, `$radius`, `$border-width`, `$outline-width`, `$transition`, `$sharp-radius`, `$bold-font-weight`, `$font-sans-fallback`, `$font-mono-fallback`;
   - listed in `tokens`;
   - a `$name` key in any style object of the same file, including `tastyStatic(':root', { … })`;
   - a `$name` key of a literal `tokens={{ … }}` JSX prop, or of the `tokens` option of `tasty()` or a configured options factory, in the same file;
   - a `'--name'` key of a literal inline `style={{ … }}` object in the same file, which declares `$name`.

`$$name` (the raw `--name`, for transitions) is checked the same way as `$name`. `tokens: false` turns the existence check off.

## Options

None.
