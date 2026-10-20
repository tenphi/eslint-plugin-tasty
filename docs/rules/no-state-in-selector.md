# tasty/no-state-in-selector

Keep sub-element `$` selectors structural. Express state conditions in property
state maps so Tasty can resolve their priority and make competing states
exclusive. Both the recommended and strict presets enable this rule as a warning.

## Reported

```js
const Content = tasty({
  styles: {
    ResponsiveWidth: {
      $: 'img:not([width]), :where(picture), video:not([width])',
      inlineSize: 'max 100%',
    },
    Link: {
      $: 'a:hover',
      color: '#active',
    },
  },
});
```

The rule reports one warning per `$` value, pointing out its first condition.
Attribute selectors (such as `[width]`, `[disabled]`, `[data-active]`, and
`[aria-expanded="true"]`) and pseudo-classes (including `:hover`, `:not()`,
`:has()`, and `:last-child`) are conditions. Conditions are also reported inside
structural grouping functions such as `:is()` and `:where()`.

## Preferred

```js
const Content = tasty({
  styles: {
    Link: {
      $: 'a',
      color: {
        '': '#text',
        '@own(:hover)': '#active',
      },
    },
    Picture: {
      $: ':where(picture)',
      inlineSize: 'max 100%',
    },
    Before: {
      $: '&::before',
      content: '""',
    },
  },
});
```

Use `@own(...)` when the state belongs to the selected sub-element, for example
`@own(![width])`. Ordinary state keys such as `:hover` refer to the root component.
Conditions on ancestors need the appropriate root/parent state expression.
When a selector list mixes conditions with unconditional targets, keep their
different behavior explicit. For example, `picture` in the reported media list
has no width condition and can own a separate unconditional style definition.

Choose a default or fallback for each property state map deliberately. Removing
a condition from `$` broadens the selector: every property in that sub-element
must retain its intended condition, and default values can affect elements that
previously received no rule. The rule provides no automatic fixes or editor
suggestions because a safe migration depends on that intent.

## Allowed structural selectors

- Tags, universal selectors, Tasty element names and `@` placeholders.
- Combinators, classes and IDs that identify the component's anatomy.
- Exact, non-namespaced `[data-element="Name"]` selectors with a nonempty name.
- Pseudo-elements, including the legacy spellings `:before`, `:after`,
  `:first-line`, and `:first-letter`.
- `:is()` and `:where()` containing only structural selectors.

## Selectors that end in a pseudo-element

When a `$` item ends in a pseudo-element, Tasty treats the pseudo-element as
the sub-element: `@own(...)` states go after it, and states a pseudo-element
cannot have (attributes, classes, `:first-child`, `:nth-*()`, `:empty`,
`:has()`, and modifiers) are dropped with a warning. A condition on the element
the pseudo-element belongs to must therefore stay in `$`, before the
pseudo-element, and the rule accepts it:

```js
const Pagination = tasty({
  styles: {
    NextArrow: {
      $: 'a[rel="next"]::before',
      content: '"→"',
    },
    Marker: {
      $: 'li:last-child::marker',
      color: '#text',
    },
    Label: {
      // Not '@::part(label):hover': @own(:hover) is the part's own state.
      $: '@::part(label)',
      color: { '': '#text', '@own(:hover)': '#active' },
    },
  },
});
```

Pseudo-classes written after the pseudo-element are its own states, which
`@own(...)` expresses exactly, so they are still reported. Conditions after it
that `@own(...)` would drop, such as `::part(label):first-child`, are not.
Conditions inside the pseudo-element, such as `::slotted(img:hover)`, are part
of what it selects and stay in `$`. A condition in an earlier compound, such as
`:last-child` in `li:last-child > a::before`, describes an ancestor and is
still reported.

"Ends in a pseudo-element" means the first `::name` or legacy single-colon
spelling in the item's last compound. Each item of a selector list is checked
on its own, so `summary::marker, li:last-child` still reports `:last-child`.

Class and ID names are treated as identities; the rule cannot infer whether a
particular class name represents application state. Keep such state in maps too.

## Scope and limits

This rule checks literal strings and templates without interpolation in
sub-element `$` values. It uses the plugin's existing Tasty style detection,
including `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, typed/shared
style objects, JSX/Storybook styles, and configured `styleFunctions` helpers.
TypeScript wrappers and statically computed `$` keys are supported.

Root selector arguments to `tastyStatic()` and `useGlobalStyles()` are outside
this rule's scope, as are unrelated JavaScript objects and dynamic selectors.
Malformed selectors that cannot be parsed are left to syntax validation; this
rule does not validate CSS syntax. Other rules may flag dynamic style values.

For an intentional exception, disable only this rule on the selector's line and
explain why its condition must remain part of the structural selection.
