# tasty/no-ignored-pseudo-element-state

Report states that Tasty ignores because they test a pseudo-element for
something it cannot have. Both the recommended and strict presets enable this
rule as an error: the reported state never applies.

When a sub-element's `$` ends in a pseudo-element, Tasty applies `@own(...)` to
the pseudo-element itself: `$: '@::part(label)'` with `@own(:focus)` becomes
`::part(label):where(:focus)`. A pseudo-element has no attributes, classes, IDs,
or place in the DOM tree, so a state that tests one of those can never match.
Tasty drops such a state at runtime with a `PSEUDO_ELEMENT_STATE_IGNORED`
warning. This rule reports the same state keys while you edit.

## Reported

```js
const Pagination = tasty({
  styles: {
    NextArrow: {
      $: 'a::before',
      content: {
        '': 'none',
        '@own([rel="next"])': '"→"', // attributes
      },
    },
    Marker: {
      $: 'li::marker',
      color: {
        '': '#text',
        '@own(:last-child)': '#accent', // position in the DOM tree
        '@own(selected)': '#active', // modifiers
      },
    },
  },
});
```

Tasty ignores these states on a pseudo-element:

- Modifiers: `@own(hovered)`, `@own(theme=dark)`.
- Attributes: `@own([open])`, `@own(:not([open]))`.
- Classes and IDs: `@own(.active)`.
- Tree-structural pseudo-classes: `:root`, `:scope`, `:empty`, `:has()`,
  `:first-child`, `:last-child`, `:only-child`, their `-of-type` forms, and
  `:nth-*()`.
- Any key that combines one of these with other states, such as
  `@own(:hover | [open])` or `:focus & @own([open])`. Tasty drops the whole key.

## Preferred

Write a condition on the element the pseudo-element belongs to in `$`, before
the pseudo-element. `tasty/no-state-in-selector` accepts these selectors.

```js
const Pagination = tasty({
  styles: {
    NextArrow: { $: 'a[rel="next"]::before', content: '"→"' },
    Marker: { $: 'li:last-child::marker', color: '#accent' },
    Label: {
      $: '@::part(label)',
      color: { '': '#text', '@own(:hover)': '#active' },
    },
  },
});
```

A pseudo-element can be in a pseudo-class state such as `:hover` or `:focus`, so
those still belong in `@own(...)`. Root states, `@parent(...)`, `@root(...)`, and
at-rule conditions describe other elements and are not reported.

## Where it applies

- A sub-element `$` item that ends in a pseudo-element: the first `::name`, or a
  legacy `:before`, `:after`, `:first-line`, or `:first-letter`, in its last
  compound. Each item of a `$` list is judged on its own. With
  `$: 'summary::marker, summary'`, Tasty ignores `@own([open])` only on
  `summary::marker`, and the message names that item.
- `&` keys and `&`-prefixed `$` values extend their owner's selector. `'&::before'`
  at the root, and `'&:hover'` under `$: 'a::before'`, are pseudo-element targets.
- A selector-mode call whose literal selector ends in a pseudo-element, such as
  `useGlobalStyles('.card::before', styles)` or `tastyStatic('.card::before',
  styles)`. There, root states describe the pseudo-element too, so
  `[data-on]`, `selected`, and `.dark` are reported, while `:hover` is not.

## Limits

- `@name` state aliases are not resolved. Tasty may still ignore a state an
  alias expands to.
- Dynamic `$` values and selector arguments are skipped. Malformed state keys
  are left to `tasty/valid-state-key`.
- The rule has no autofix. Moving a condition into `$` changes which element
  every property of that sub-element applies to, so the author must choose.
