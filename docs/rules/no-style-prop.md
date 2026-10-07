# tasty/no-style-prop

Warn about React's `style` prop on recognized Tasty components. Enabled as a
warning in both presets.

Define token references in the component's styles and use `tokens` for dynamic
per-instance values:

```tsx
import { tasty } from '@tenphi/tasty';

const Progress = tasty({ styles: { width: '$progress' } });

// Warning: move the dynamic value to a token consumed by the definition.
<Progress style={{ width: `${percent}%` }} />;

// Preferred.
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

Recognition uses local `const` components created by imported `tasty()` or
configured options factories, their `const` aliases/sub-elements, and components
from configured `importSources`. List the design-system module in `importSources`
for imported components. Native elements, unrelated components, shadowed bindings,
mutable aliases, and opaque spread bindings are excluded.
