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

Recognition uses local `const` Tasty/configured-options factory results, their
`const` aliases/sub-elements, and imports from `importSources`. Native elements,
unrelated components, type-only imports, shadowed bindings, mutable aliases, and
opaque spread bindings are excluded.
