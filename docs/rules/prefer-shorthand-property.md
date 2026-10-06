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
The diagnostic's `initial` placeholders describe an otherwise unconstrained
dimension; keep any constraints from the original definition when adding a token.

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

For sub-elements, declare the token default on the component root and reference
it from the sub-element's shorthand. A default declared on the sub-element itself
would take precedence over a token inherited from the root.

`useStyles`, `useGlobalStyles`, and `tastyStatic` produce classes or CSS rather than
a component accepting `tokens`. Their diagnostics instead recommend setting the
corresponding CSS custom property on the target element, for example
`element.style.setProperty('--min-height', '160px')`. These values must use CSS
units; the component `tokens` prop processes Tasty units such as `20x` for you.

Preset names and modifiers are static. For independent typography overrides,
use the CSS value tokens referenced by the original named preset, such as
`$body-font-size` for `preset: 'body'`. A token cannot replace the preset name
or its modifiers. Scrollbar width and gutter modifiers are also static;
independent token overrides belong in the `scrollbarWidth` or `scrollbarGutter`
longhand instead of the `scrollbar` DSL.

Autofixes remain limited to existing equivalent key renames, such as
`backgroundColor` to `fill`, outside extension layers. This rule does not create
tokens or rewrite partial overrides automatically.
