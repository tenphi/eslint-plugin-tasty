# tasty/prefer-element-selector

Prefer Tasty element names over explicit `data-element` attributes in sub-element
`$` selectors. The recommended and strict presets enable this rule as a warning.
It provides an autofix when the shorter form preserves the generated selector.

```js
// Before
const Component = tasty({
  styles: {
    Search: {
      $: '[data-element="Primary"] > [data-element="Search"]',
      display: 'block',
    },
  },
});

// After autofix
const Component = tasty({
  styles: {
    Search: {
      $: 'Primary > Search',
      display: 'block',
    },
  },
});
```

The rule reports one warning per eligible `$` value and shortens all safe
attributes in that value. It accepts exact, unnamespaced `data-element` equality
selectors whose names match `[A-Z][a-zA-Z0-9]*`, including single-quoted,
double-quoted and unquoted CSS values. Child and sibling combinators, selector
lists and explicit `&` prefixes are supported.

## Preserving the target

Tasty can append the owning sub-element after a different trailing element name.
For example, in an `Other` sub-element, the rule fixes:

```js
Other: {
  // Before: '[data-element="Primary"] > [data-element="Search"]'
  $: 'Primary > [data-element="Search"]',
}
```

The final attribute remains explicit because `$: 'Primary > Search'` in that
scope would select `Search`'s `Other` descendants instead of `Search` itself.

Element names also insert a separator. Attributes inside compounds, including
whitespace that the affix renderer ignores, remain explicit. For example,
`'[data-element="Primary"][data-element="Search"]'` becomes
`'Primary[data-element="Search"]'`, preserving the same-element requirement.

## Scope and limits

This rule checks literal sub-element `$` values and templates without
interpolation. It supports the plugin's existing Tasty style contexts, including
typed/shared styles, JSX/Storybook styles, nested sub-elements and configured
`styleFunctions`. TypeScript wrappers and statically computed keys are supported.
Root `$` values, global selector arguments and unrelated objects are outside its
scope.

Attributes with CSS comparison flags, namespaces, non-equality operators or
unsupported names remain explicit. Branches containing pseudo selectors or
other unsupported syntax are left alone. Selectors containing comments or CSS
escapes are also left alone. These are conservative rewrite limits, not syntax
errors. Existing state-selector rules still apply independently.

If the JavaScript source uses escapes (for example, escaped quotes), the warning
can still appear, but no autofix is offered: source offsets may differ from the
string's actual value.
