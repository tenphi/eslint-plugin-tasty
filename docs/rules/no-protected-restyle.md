# tasty/no-protected-restyle

Warn when a design system's protected components are restyled rather than
customized through their props. Enabled as a warning in both presets; it does
nothing until a `tasty.config.*` lists `protectedComponents`.

A design system built on Tasty exposes `styles` and `*Styles` props on its
components, but for most of them the look is a contract: a consumer picks a
`type`, `theme` or `size` rather than restyling a `Button`. This rule lets the
design system say which components those are, and asks an override to explain
itself.

## Configuration

The design system ships the list in its own `tasty.config.*`, and consumers
inherit it through `extends`:

```ts
// @my-org/ui tasty.config.ts
import type { TastyValidationConfig } from '@tenphi/eslint-plugin-tasty';

export default {
  importSources: ['@my-org/ui'],
  protectedComponents: [
    {
      source: '@my-org/ui',
      exclude: ['Block', 'Flex', 'Grid', 'Space', 'Text', 'Title', '*Icon'],
      allowedStyleProps: ['position', 'dimension'],
    },
  ],
} satisfies TastyValidationConfig;
```

```ts
// the consumer's tasty.config.ts
export default {
  extends: '@my-org/ui',
};
```

| Key | Meaning |
| --- | --- |
| `source` | The package the components are imported from. `*` matches any run of characters. |
| `include` | Exported names or member paths to protect. Defaults to every export. |
| `exclude` | Exported names or member paths to leave open, usually layout and typography primitives. `*` matches any run of characters, so `*Icon` covers every icon. |
| `allowedStyleProps` | Style props that place or size the root and stay allowed. `'position'` and `'dimension'` stand for Tasty's `POSITION_STYLES` (`gridArea`, `margin`, `inset`, `zIndex`, …) and `DIMENSION_STYLES` (`width`, `height`, `flex`, …); anything else is a property name. Defaults to none. |

A component matches the first entry whose `source`, `include` and `exclude` fit
it, so a second entry for the same source can give a few components their own
`allowedStyleProps`. Entries from an extended config come first; a config can
add its own, or set `protectedComponents: false` to drop the inherited ones.

### Sub-components

A sub-component such as `<Button.Primary>` follows the entry of the export it
hangs off, which suits one that shares its parent's contract. Some are separate
components attached for convenience, though: `Button.Group` may be a layout
primitive. A name with a dot in `include` or `exclude` is a member path
(`'Button.Group'`, `'Menu.*'`), and an entry that names a component's member
path decides for it before any entry that matches only its export:

```ts
protectedComponents: [
  {
    source: '@my-org/ui',
    exclude: ['Space', 'ButtonGroup', 'Button.Group'],
    allowedStyleProps: ['position', 'dimension'],
  },
  // `Button.Split` gets its own allowance; `Button` and `Button.Primary` don't.
  { source: '@my-org/ui', include: ['Button.Split'], allowedStyleProps: ['direction'] },
],
```

```tsx
<Button.Group gap="1x" flow="row" />; // passes: Button.Group is excluded
<Button.Split direction="column" />; // passes
<Button gap="1x" />; // reported: Button keeps its contract
```

The longest named path wins, so `'Button.Group'` also covers
`<Button.Group.Item>`, and the first entry that names a path decides it:
excluding the path leaves it open, including it protects it with that entry's
`allowedStyleProps`. Patterns without a dot, `*` included, only ever match the
export name.

For `extends: '@my-org/ui'` to find the list, the package has to publish its
`tasty.config.*` at the package root.

The design system's own source imports its components by relative path, which
does not match `source`, so the design system itself is not held to the rule.

## What it reports

On a protected component:

```tsx
import { tasty } from '@tenphi/tasty';
import { Button, ComboBox } from '@my-org/ui';

// Instance styles: `styles` and every `*Styles` prop.
<Button styles={{ fill: '#danger' }} />;
<ComboBox inputStyles={{ padding: '2x' }} />;

// Appearance style props.
<Button fill="#danger" radius="round" />;

// Wrappers that restyle it: `styles`, `variants`, or `*Styles` and appearance
// style props among their default props.
const DangerButton = tasty(Button, { styles: { fill: '#danger' } });

// Wrappers of wrappers still restyle `Button`.
const CopyButton = tasty(Button, { type: 'clear' });
<CopyButton styles={{ fill: '#danger' }} />;
tasty(CopyButton, { fill: '#danger' });
```

And not:

```tsx
// Its own props, tokens and mods.
<Button type="primary" theme="danger" size="small" tokens={{ $gap: '1x' }} />;

// Allowed style props, and root `styles` whose keys are all allowed.
<Button width="100%" gridArea="actions" />;
<Button styles={{ width: '100%', gridArea: 'actions' }} />;

// A wrapper that only sets semantic defaults.
const CopyButton = tasty(Button, { type: 'clear', size: 'small' });
```

Root `styles` passes only as an inline object whose every key is an allowed
style prop. A sub-element key, a spread, or a variable holding the styles is
reported. `*Styles` props style the component's inner elements, so they are
always reported.

A style prop is a Tasty style property or an entry in `config.styles`. Plain
CSS property names are left out, because some of them (`size`, `orientation`)
are common semantic props. With
[`typeAwareJSX`](../../README.md#experimental-type-aware-jsx-props) on, a prop
the component declares with its own type (such as a `position: 'before' |
'after'` prop) is not a style prop either. Callbacks and JSX values are never
style values.

## Recognition

A component resolves to the name its source exports it under, so:

- an aliased import (`import { Button as UIButton }`) still counts;
- a namespace member (`<UI.Button>`) is `Button`;
- a sub-component (`<Text.Strong>`) follows `Text`, so excluding `Text` leaves
  `Text.Strong` open too, unless an entry names the member path (see
  [Sub-components](#sub-components));
- `const` aliases and `tasty()` wrappers are followed, within the file and
  across relative imports, along with relative re-exports and `export *` from a
  protected source. Following relative modules needs the `typescript` package.

Shadowed bindings, `let` aliases, type-only imports and native elements are not
protected components.

## Intentional overrides

A justified override takes a reasoned disable on its line:

```tsx
// eslint-disable-next-line tasty/no-protected-restyle -- campaign banner needs the brand fill
<Button fill="#brand" />;
```

## Relation to `no-styles-prop`

`tasty/no-styles-prop` reports instance `styles` on every recognized Tasty
component. Once a design system lists its protected components, this rule
covers those with a message that names the component. A project that relies on
it can turn `no-styles-prop` off, so layout primitives keep `styles` as their
expected API.
