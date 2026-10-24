# tasty/no-classname-prop

Warn about `className` on recognized Tasty components. Enabled as a warning in
both presets.

Keep styling in Tasty rather than attaching external styling classes. When a
class identifies a sub-element for its parent to style, replace that identity
with `data-element="Name"` and a matching capitalized sub-element key:

```tsx
import { tasty } from '@tenphi/tasty';

const Card = tasty({ styles: { Body: { padding: '2x' } } });
const Box = tasty({ as: 'div' });

// Warning: avoid external class-based styling.
<Card>
  <Box className="card-body" />
</Card>;

// Preferred: Card's Body styles target this element.
<Card>
  <Box data-element="Body" />
</Card>;
```

For general root styling, define styles on the component or use a styled wrapper.
`data-element` is an identity for parent sub-element styling, not a replacement
for an arbitrary list of CSS classes.

The rule checks every explicit attribute value and visible `className` keys in
inline object spreads. It has no automatic fix because external classes can have
multiple styling or behavior roles.

A third-party library may require a class for its stylesheet or behavior. Keep
that integration and acknowledge the exception with an explicit local ignore and
a reason:

```tsx
const libraryElement = (
  // eslint-disable-next-line tasty/no-classname-prop -- library stylesheet requires this class
  <Box className={libraryClassName} />
);
```

Place the directive immediately before the reported attribute line. It suppresses
only this rule for that line. The warning message includes this exception path;
the plugin does not silently exempt library-provided values or enforce reasons.

## Shared with `react/forbid-component-props`

Projects often forbid `className` on every component with React's
`react/forbid-component-props`, which reports the same attribute on Tasty
components. A disable directive for that rule also covers this one, so a single
exception acknowledges both:

```tsx
// eslint-disable-next-line react/forbid-component-props -- library stylesheet requires this class
<Box className={libraryClassName} />
```

`-next-line`, `-line` and block `disable`/`enable` directives count, in ESLint's
`eslint-` or Oxlint's `oxlint-` spelling, wherever they would cover the reported
attribute. A directive for this rule alone still leaves the React rule reporting.

### Options

```js
'tasty/no-classname-prop': ['warn', { alsoDisabledBy: ['react/forbid-component-props'] }],
```

`alsoDisabledBy` lists the rules whose disable directives also silence this
rule. It defaults to `['react/forbid-component-props']`; set it to `[]` to
require a directive naming `tasty/no-classname-prop` itself.

Recognition uses local `const` Tasty/configured-options factory results, their
`const` aliases/sub-elements, and imports from `importSources`. Exports of relative modules (`import { Panel } from './styled'`) count when they
resolve to one of these, through re-exports too; following them needs the
`typescript` package. Native elements,
unrelated components, type-only imports, shadowed bindings, mutable aliases, and
opaque spread bindings are excluded.
