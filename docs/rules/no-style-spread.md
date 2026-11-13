# tasty/no-style-spread

Reports object and array spreads inside runtime Tasty style objects, and recommends `mergeStyles(...)` when a style object is built from two or more spreads.

**Presets:** warning in recommended and strict. **Fix:** none.

## Why

A spread hides which properties a style object defines and makes overrides hard to review. Object spread is also shallow: spreading `Label: { fill: '#accent' }` over `Label: { padding: '2x', fill: '#surface' }` loses `padding`. `mergeStyles` merges sub-elements and state maps the way Tasty does.

## Examples

```js
// ❌ Use mergeStyles(...) to compose Tasty style objects.
const finalStyles: Styles = { ...outerStyles, ...styles };

// ✅ Tasty's merge, in the same override order
const mergedStyles: Styles = mergeStyles(outerStyles, styles);

// ❌ List Tasty style properties explicitly instead of spreading.
const Card = tasty({
  styles: {
    ...sharedStyles,
    fill: { '': '#surface', active: '#primary' },
  },
});
```

## What is reported

- **Two or more spreads at the root of a style object** get one `mergeStyles` warning, at the first spread. This includes typed and shared objects such as `const finalStyles: Styles = { ...outerStyles, ...styles }`, call-site styles, variants, JSX and Storybook styles, and configured helpers.
- **Every other spread** in a runtime style object, including state maps and sub-elements, gets a plain warning.

There is no autofix: `mergeStyles` changes override behavior. A state map without `''` extends the inherited entries, while a map with `''` replaces them.

`tastyStatic()` spreads stay errors under [`tasty/static-no-dynamic-values`](static-no-dynamic-values.md): the extractor rejects them, and a disable comment does not make them valid. To fail CI on warnings that nobody suppressed, run ESLint with `--max-warnings=0`.

## Exceptions

An intentional spread takes a disable comment on its line, with a reason:

```js
const Card = tasty({
  styles: {
    // eslint-disable-next-line tasty/no-style-spread -- generated defaults are shared by all cards
    ...sharedStyles,
  },
});
```

With Oxlint, `// oxlint-disable-next-line` works the same way.

## Options

None.
