# tasty/no-style-prop

Warn about React's `style` prop on recognized Tasty components. The [`elements`](#options) option extends the check to
every component or element, so this rule can replace React's `style`
restriction.

**Presets:** warning in recommended and strict. **Fix:** none.

Define token references in the component's styles and use `tokens` for dynamic
per-instance values:

```tsx
import { tasty } from '@tenphi/tasty';

const Progress = tasty({ styles: { width: '$progress' } });

// ❌ Move the dynamic value to a token consumed by the definition.
<Progress style={{ width: `${percent}%` }} />;

// ✅ Preferred.
<Progress tokens={{ $progress: `${percent}%` }} />;
```

The warning covers literals, variables, calls, conditional expressions, null,
and visible `style` keys in inline JSX object spreads. It does not rewrite the
prop: choosing a token and declaring its reference requires the component's
styling contract.

A third-party positioning or animation library may require applying its inline
styles through `style`. Keep that integration and acknowledge the exception with
an explicit local ignore and a reason:

```tsx
const floating = (
  // eslint-disable-next-line tasty/no-style-prop -- positioning library supplies these inline styles
  <Progress style={positioningStyles} />
);
```

Place the directive immediately before the reported attribute line. It suppresses
only this rule for that line. The warning message includes this exception path;
the plugin does not silently exempt library-provided values or enforce reasons.

## Options

```js
'tasty/no-style-prop': ['warn', { elements: 'all' }],
```

| `elements`          | Reports `style` on                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `'tasty'` (default) | Recognized Tasty components                                                                                 |
| `'components'`      | Every component: Tasty ones, other capitalized tags, and member tags such as `<UI.Panel>` or `<motion.div>` |
| `'all'`             | Every component and native element, such as `<div>`, `<my-element>` or `<svg:rect>`                         |

On a Tasty component the message suggests token references and `tokens`. On any
other element it suggests moving the styles into Tasty: render a `tasty()`
element, or wrap the component with `tasty(Component, { styles })`.

```js
'tasty/no-style-prop': ['warn', { values: 'static' }],
```

| `values`          | Reports                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `'all'` (default) | Every `style`                                                                                           |
| `'static'`        | A `style` whose every value is a literal, written inline or as a local `const` object, and Tasty syntax |

A static `style` always has a Tasty form: style props or the component's styles,
where Tasty units, tokens and states apply. A runtime value (a measured
position, a size from a prop, a user's theme) is the same inline custom property
whether it is written in `style` or in `tokens`, so `'static'` leaves it to the
author. A `style` built from a spread, a call, a conditional, a template with
substitutions or a computed key is not static.

### Tasty syntax in `style`

`style` hands its values to the browser unparsed, so a Tasty unit (`'4x'`,
`'1bw'`), a color token (`'#dark'`) or a `$` token in a literal value is an
invalid declaration that the browser drops. The rule reports it under either
`values` setting, even when the other values are dynamic, and names the value.
A raw hex color, `var()` and CSS units, `lh` included, are left alone.

## Replacing React's `style` restriction

`react/forbid-component-props` and `react/forbid-dom-props` are each one rule
for every prop they forbid, and a disable directive cannot target a single
forbidden prop. When they forbid `style`, a `style` exception on a Tasty
component has to name the React rule as well as this one, and the React part
also hides any other forbidden prop, such as `className`, on that line.

Let this rule handle `style` instead, and keep the React rules for the other
props:

```js
rules: {
  // Without options, forbid-component-props forbids both className and style.
  'react/forbid-component-props': ['error', { forbid: ['className'] }],
  // Remove 'style' from forbid-dom-props, or turn the rule off if 'style' was
  // its only entry.
  'react/forbid-dom-props': 'off',
  'tasty/no-style-prop': ['warn', { elements: 'all' }],
},
```

The rule names are the same in an Oxlint config. Use `elements: 'components'`
instead to leave native elements to `react/forbid-dom-props`. A `style`
exception then names this rule only, and leaves every other check on the line in
place:

```tsx
// eslint-disable-next-line tasty/no-style-prop -- positioning library supplies these inline styles
<Popover style={positioningStyles} />
```

After the switch, existing `style` exceptions that name a React rule no longer
suppress anything. ESLint reports them as unused disable directives (a warning
by default, see `linterOptions.reportUnusedDisableDirectives`); Oxlint does with
`--report-unused-disable-directives`. Rename each to `tasty/no-style-prop`.

Recognition uses local `const` components created by imported `tasty()` or
configured options factories, their `const` aliases/sub-elements, and components
from configured `importSources`. Exports of relative modules (`import { Panel } from './styled'`) count when they
resolve to one of these, through re-exports too; following them needs the
`typescript` package. List the design-system module
in `importSources` for components imported from a package. Native elements, unrelated components, shadowed bindings,
mutable aliases, and opaque spread bindings are excluded.
