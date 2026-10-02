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
  `:first-line`, and `:first-letter`. Conditions inside `::slotted()` are checked.
- `:is()` and `:where()` containing only structural selectors.

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
