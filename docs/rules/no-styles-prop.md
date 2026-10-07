# tasty/no-styles-prop

Warn about instance `styles` props on recognized Tasty components. Enabled as a
warning in both presets.

Choose the replacement according to the override:

- Dynamic values: declare token references and pass `tokens`.
- State changes: define state maps and pass `mods` or exposed modifier props.
- Supported customization: use exposed style props or variants.
- Structural or reusable overrides: create a `tasty(Component, { styles })` wrapper.

```tsx
import { tasty } from '@tenphi/tasty';

const Box = tasty({ styles: { padding: '1x' } });

// Warning: prefer a named, reusable extension.
<Box styles={{ padding: '2x' }} />;

// Preferred.
const RoomyBox = tasty(Box, { styles: { padding: '2x' } });
<RoomyBox />;
```

Variables, function results, conditional values, TypeScript wrappers, null, and
visible `styles` keys in inline JSX object spreads are checked too. The rule is
report-only: choosing a token, state, variant, or wrapper requires the component's
contract. Intentional escape-hatch usage can use a rule-specific ESLint suppression
with a reason.

Recognition uses local `const` Tasty/configured-options factory results, their
`const` aliases/sub-elements, and imports from `importSources`. Native elements,
unrelated components, type-only imports, shadowed bindings, mutable aliases, and
opaque spread bindings are excluded. Factory definition options (`tasty({ styles })`
or `tasty(Component, { styles })`) are allowed.
