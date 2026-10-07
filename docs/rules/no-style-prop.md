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
styling contract. Intentional library integration can use a rule-specific ESLint
suppression with a reason.

Recognition uses local `const` components created by imported `tasty()` or
configured options factories, their `const` aliases/sub-elements, and components
from configured `importSources`. List the design-system module in `importSources`
for imported components. Native elements, unrelated components, shadowed bindings,
mutable aliases, and opaque spread bindings are excluded.
