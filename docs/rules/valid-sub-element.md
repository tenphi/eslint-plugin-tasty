# tasty/valid-sub-element

Sub-element values must be style objects, or `false` to disable the sub-element.
Their `$` selectors must select inner elements or pseudo-elements, rather than
reuse the sub-element mechanism to style the component root. Both recommended
and strict presets enable this rule as an error.

For a nested sub-element, `&` attaches to the containing sub-element's selector
rather than the component root. A nested `Heading: { $: '&:is(h1)' }` inside
`Outer` therefore styles `Outer` itself. Put that condition in `Outer`'s property
state maps using `@own(:is(h1))`, or select a descendant heading instead.

## Reported

```js
const Heading = tasty({
  styles: {
    Level1: { $: '&:is(h1)', preset: 'h1' },
    Level2: { $: '&:is(h2)', preset: 'h2' },
  },
});
```

`&:is(h1)` attaches directly to the root selector. It selects a root `h1`,
rather than an element named `Level1`. The same issue applies to root compounds
such as `&.active` or `&[data-level="1"]`. Each `$` value gets one error, even
when several branches select the root. A root-targeting branch is also reported
in a list that contains valid pseudo-element or descendant selectors.

## Style the root with a property state map

If the component itself can be a heading, put the condition in the root's
property state map. Preset names below assume corresponding configured presets.

```js
const Heading = tasty({
  styles: {
    preset: {
      '': 'body',
      ':is(h1)': 'h1',
      ':is(h2)': 'h2',
      ':is(h3)': 'h3',
      ':is(h4)': 'h4',
      ':is(h5)': 'h5',
      ':is(h6)': 'h6',
    },
  },
});
```

Choose the default or fallback preset according to the component's contract.

## Select descendant headings with an affix

If the headings are inside the component, use a descendant selector:

```js
const Content = tasty({
  styles: {
    Level1: { $: 'h1', preset: 'h1' },
    Level2: { $: 'h2', preset: 'h2' },
  },
});
```

The `h1` affix selects descendant `h1` tags. Omitting `$` selects
`[data-element="Level1"]` instead. Combinators and `@` placeholders remain
supported, for example `$: '>h1'` and `$: '>@'`.

Root pseudo-elements remain valid:

```js
Before: { $: '&::before', content: '""' }
```

The legacy pseudo-element spellings `:before`, `:after`, `:first-line`, and
`:first-letter` are also supported. The separate `no-state-in-selector` rule
may warn about conditions such as `&:hover::before`; those conditions belong
in property state maps.

## Scope and limits

The selector check applies to literal strings and templates without interpolation
inside owned sub-elements, including nested sub-elements, typed/shared styles,
JSX/Storybook styles, and configured style helpers. TypeScript wrappers and
statically computed sub-element and `$` keys are supported.

Root `$` values, selector arguments to `tastyStatic()` or `useGlobalStyles()`,
unrelated objects, and dynamic selectors are outside the selector check.
Malformed selectors that cannot be parsed are left to syntax validation.

There is no autofix or editor suggestion: choosing between a root state map and
a descendant selector changes which elements receive the styles.
