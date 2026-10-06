# `tasty/prefer-shorthand-property`

Prefer Tasty's shorthand properties when defining a complete style, such as
`fill` instead of `backgroundColor` or `height` instead of separate size constraints.

A shorthand can also reset values you did not intend to change. For example,
replacing `minHeight: '20x'` with `height: 'min 20x'` resets `height` to `auto` and
`max-height` to `initial`. In a component extension, it replaces the base's whole
`height` definition, including its state map. The rule reports these changes
without an autofix.

For an independent override, expose the relevant part as a token in the original
component definition. Keep the other values and any states already defined there:

```tsx
const Card = tasty({
  styles: {
    '$min-height': '100vh',
    height: '$min-height auto 100vw',
  },
});

// Changes only min-height; height and max-height keep their original values.
<Card tokens={{ '$min-height': '20x' }} />;
```

The default token preserves the original minimum height until it is overridden.
Use your existing height and maximum height in place of `auto` and `100vw`.

Two dimension values mean **minimum and maximum**, with the main size set to
`auto`: `height: '$min-height 100vw'` sets `min-height` and `max-height`. Three
values mean **minimum, size, maximum**: `height: '$min-height 100vh 100vw'` also
sets an explicit height. The same pattern works for `width`, `blockSize`, and
`inlineSize`, and for independent maximum-size overrides.

The diagnostics also recommend tokens for other partial shorthand overrides,
such as one padding edge or one border part. Add the token in the original
definition while preserving its other values, then override it through `tokens`.
Extension diagnostics point to the base component, where the token must be
exposed. Reports over imported components you cannot edit remain suppressed;
`ownedSources` can opt a design system from your own project back in.

Autofixes remain limited to existing equivalent key renames, such as
`backgroundColor` to `fill`, outside extension layers. This rule does not create
tokens or rewrite partial overrides automatically.
