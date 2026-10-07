# @tenphi/eslint-plugin-tasty

ESLint plugin for validating `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, and related APIs from `@tenphi/tasty`.

Catch typos, invalid syntax, and enforce best practices in your tasty style objects at lint time.

**Targets `@tenphi/tasty` v3.8+.** v1 of this plugin validates the v3 style DSL: kebab-case at-rule keys (`@property`, `@font-face`, `@counter-style`, `@function`), `$$name(...)` CSS-function calls, and one value per directional group. The v2 at-rule spellings are reported with an auto-fix, so `eslint --fix` handles most of the upgrade. For tasty v2, pin `@tenphi/eslint-plugin-tasty@^0.11`.

## Installation

```bash
pnpm add -D @tenphi/eslint-plugin-tasty
```

## Usage

### ESLint Flat Config (ESLint 9+)

```js
// eslint.config.js
import tasty from '@tenphi/eslint-plugin-tasty';

export default [
  tasty.configs.recommended,
  // your other configs...
];
```

For stricter checks:

```js
import tasty from '@tenphi/eslint-plugin-tasty';

export default [
  tasty.configs.strict,
];
```

### Manual Rule Configuration

```js
import tasty from '@tenphi/eslint-plugin-tasty';

export default [
  {
    plugins: { tasty },
    rules: {
      'tasty/known-property': 'warn',
      'tasty/valid-value': 'error',
      'tasty/valid-color-token': 'error',
      // ...
    },
  },
];
```

### oxlint

Use oxlint's [JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins)
to load the same plugin and rule maps. JavaScript plugin support is experimental;
the integration tests run against oxlint 1.83.0.

```ts
// oxlint.config.ts
import { defineConfig } from 'oxlint';
import { recommended } from '@tenphi/eslint-plugin-tasty';

export default defineConfig({
  jsPlugins: [{ name: 'tasty', specifier: '@tenphi/eslint-plugin-tasty' }],
  rules: recommended,
});
```

Run `oxlint --config oxlint.config.ts src`. Both linters read `tasty.config.*`
relative to the file being linted, including custom function signatures below.

## Project Configuration

Create a `tasty.config.ts` (or `.js`, `.json`) at your project root to configure validation:

```ts
// tasty.config.ts
export default {
  tokens: ['#primary', '#danger', '#surface', '$spacing', '$gap'],
  units: ['cols'],
  functions: ['double', 'okhsl'],
  states: ['@mobile', '@tablet', '@dark'],
  presets: ['h1', 'h2', 'h3', 't1', 't2', 't3'],
  recipes: ['card', 'elevated', 'reset'],
  styles: ['glaze'],
  importSources: ['@my-org/design-system'],
  ownedSources: ['@my-org/*'],
};
```

Every list defaults to "don't check": omit `tokens` and token existence is not
validated, set `tokens: false` to disable the check even though a parent config
sets it. `importSources` matters when you re-export `tasty()` from your own
module — the plugin only recognizes `tasty({ styles })` when the call comes from a
tracked import, so a local barrel needs listing here.

`ownedSources` answers a different question: which base components you can edit.
When a rule's advice is "change the component you are extending", it stays quiet
over a base imported from someone else's package. Components declared in the same
file and relative, absolute, `~`, `#` or `@/` imports count as yours already —
list a scope here only for a design system you publish from your own monorepo
(`*` matches any run of characters).

> `functions` was called `funcs` before v1. The old spelling is still read as a
> deprecated alias.

### Custom style functions

Design systems can wrap Tasty with their own component factories and style
helpers. Register their named exports in `styleFunctions` and list their modules
in `importSources`:

```ts
// tasty.config.ts
import type { TastyValidationConfig } from '@tenphi/eslint-plugin-tasty';

export default {
  importSources: ['@my-org/styling'],
  styleFunctions: {
    defineComponent: { argument: 1, kind: 'options' },
    resolveComponentStyles: { argument: 1, kind: 'styles' },
    mergeStyles: { argument: 'all', kind: 'styles', partial: true },
  },
} satisfies TastyValidationConfig;
```

```ts
import { defineComponent as component, resolveComponentStyles, mergeStyles } from '@my-org/styling';

component('Card', {
  styles: { padding: '1x', Label: { color: '#text' } },
  variants: { compact: { padding: '0.5x' } },
});
resolveComponentStyles('Card', { padding: '1x' });
mergeStyles(base, { fill: { hovered: '#active' } });
```

| Option | Meaning |
| --- | --- |
| `argument` | Zero-based argument index, or `'all'` to inspect every argument. |
| `kind: 'styles'` | The argument itself is a Tasty style object. |
| `kind: 'options'` | The argument contains `styles` and/or `variants`; each variant is a style object. Other options are ignored. |
| `partial` | Defaults to `false`. Set to `true` for helpers that merge partial overrides into existing styles. Allows state maps without a default and disables shorthand fixes that could overwrite a base style. Variants remain independent definitions, like `tasty(Base, options)`. |

Signatures are keyed by the **exported name**, so named import aliases work.
Default imports, namespace calls, local functions, and imports from unlisted
modules are not matched through this configuration. A local binding that shadows
an imported helper is ignored. Only inline object literals are inspected, including
TypeScript `as` and `satisfies` wrappers; arguments are not evaluated or followed
through variable references. Existing `Styles` variable detection still applies.
For a fixed argument index, calls with a preceding spread argument are skipped
because its length could move the object to a different parameter.

Sub-elements inherit their containing style context. Built-in Tasty signatures
take precedence and cannot be redefined. Config inheritance merges `styleFunctions`
by name, with the nearest config replacing the entire signature for that name.
The `functions` setting above continues to describe functions inside style values;
`styleFunctions` describes JavaScript calls. `StyleFunctionConfig` is also exported
for typing shared signatures.

## Rules

### Recommended

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/known-property` | warn | Unknown style property names (checked against the full MDN/W3C CSS property set) |
| `tasty/valid-value` | error | Malformed style values (unbalanced parens, !important) |
| `tasty/valid-color-token` | error | Invalid color token syntax or unknown tokens |
| `tasty/valid-custom-unit` | error | Unknown custom units |
| `tasty/valid-boolean-property` | error | `true` on properties that don't support it, in a state map as well as on a direct value. Includes `fill`, which tasty documents as taking `true` but currently renders as `background-color: true` |
| `tasty/valid-state-key` | error | Invalid state key syntax in style mappings (including misuse of the `_` fallback floor) |
| `tasty/valid-styles-structure` | error | Invalid styles object structure, and the v2 at-rule key spellings (auto-fixable) |
| `tasty/no-nested-state-map` | error | Nested state maps (not supported) |
| `tasty/no-important` | error | `!important` usage (breaks tasty specificity) |
| `tasty/valid-sub-element` | error | Sub-element values must be style objects; `$` selectors must not target the root element ([details](docs/rules/valid-sub-element.md)) |
| `tasty/valid-directional-modifier` | error | Directional modifiers on wrong properties, and more than one value in a group that names directions. Physical properties take `top`/`right`/`bottom`/`left`, logical ones `start`/`end`, and mixing the two is reported in either direction |
| `tasty/valid-radius-shape` | error | Unknown radius shape keywords |
| `tasty/valid-preset` | error | Unknown preset names |
| `tasty/valid-recipe` | error | Unknown recipe names |
| `tasty/valid-transition` | warn | Unknown transition property names |
| `tasty/no-nested-selector` | warn | `&`-prefixed nested selectors (use sub-elements) |
| `tasty/no-state-in-selector` | warn | Pseudo-class and attribute conditions in sub-element `$` selectors; put conditions in property state maps ([details](docs/rules/no-state-in-selector.md)) |
| `tasty/prefer-element-selector` | warn | Prefer element names such as `Primary > Search` over exact `data-element` attributes in sub-element `$` selectors (safely autofixable; [details](docs/rules/prefer-element-selector.md)) |
| `tasty/static-no-dynamic-values` | error | Dynamic values in `tastyStatic()` |
| `tasty/static-valid-selector` | error | Invalid selector in `tastyStatic(selector, ...)` |
| `tasty/require-default-state` | error | Missing default (`''`) or fallback floor (`_`) key in state mappings (skipped for extending calls) |
| `tasty/no-own-at-root` | warn | `@own()` used at root level where it is redundant |
| `tasty/valid-default-state-order` | warn | Misplaced default (`''`) or redundant `''` when only `_` is present |
| `tasty/prefer-shorthand-property` | warn | Use Tasty shorthand instead of native CSS properties (`backgroundColor` → `fill`, `paddingBlock` → `blockPadding`, etc.). Report-only warnings explain how to override one part through a token, with concrete min/max dimension examples. Extension warnings point at the base component and are skipped over bases you cannot edit (see `ownedSources`; [details](docs/rules/prefer-shorthand-property.md)) |
| `tasty/no-raw-color-values` | warn | Raw hex/rgb/`okhsl`/`okhst`/`oklch`/named colors instead of `#color` tokens |
| `tasty/no-raw-transition-duration` | warn | Hardcoded `transition` duration (`fill 0.2s`) in Tasty styles or a local `tasty()` component's `transition` prop. Suggests a configured duration token or the implicit per-name timing; zero and delays are left alone |
| `tasty/no-runtime-styles-mutation` | warn | JavaScript variables, calls, conditionals, computed keys, or interpolated templates in Tasty style values; use states and tokens instead |
| `tasty/no-style-spread` | warn | Object or array spreads inside runtime Tasty styles; recommends `mergeStyles` for multiple root spreads; intentional spreads need a per-line suppression and reason |
| `tasty/no-style-prop` | warn | `style` on recognized Tasty components; use token references and the `tokens` prop ([details](docs/rules/no-style-prop.md)) |
| `tasty/no-classname-prop` | warn | `className` on recognized Tasty components; keep styling in Tasty or use `data-element` for sub-elements ([details](docs/rules/no-classname-prop.md)) |
| `tasty/no-styles-prop` | warn | Instance `styles` on recognized Tasty components; use `tokens`, `mods`, exposed props/variants, or `tasty(Component, { styles })` ([details](docs/rules/no-styles-prop.md)) |
| `tasty/consistent-token-usage` | warn | Nonzero raw pixel lengths, including compounds, expressions and numeric inputs to enhanced length handlers |
| `tasty/prefer-auto-calc` | warn | `calc(...)` instead of Tasty auto-calc `(...)` |
| `tasty/prefer-state-negation` | warn | Top-level `:not(...)` in state keys instead of the `!` prefix (autofixable; nested CSS selectors stay intact) |
| `tasty/prefer-custom-property-syntax` | warn | `var(--prop)` / `$x-color` / `transparent` / `currentColor` instead of `$prop` / `#color` / `#clear` / `#current` |
| `tasty/prefer-hide` | warn | `display: 'none'` instead of `hide: true` |
| `tasty/prefer-directional-shorthand` | warn | 4-value `margin`/`padding`/`inset`/`radius`/`fade`/`border` with placeholder positions instead of directional form |
| `tasty/prefer-longhand-property` | error | Lossy `flex` shorthand instead of `flexGrow` / `flexShrink` / `flexBasis` |

### Strict (includes all recommended rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/valid-custom-property` | warn | Unknown `$name` custom properties |
| `tasty/valid-state-definition` | warn | Invalid state definition values in `configure()` or `tasty.config` |
| `tasty/no-unknown-state-alias` | warn | Unknown `@name` state aliases |

### Structural selectors and state maps

`tasty/valid-sub-element` reports selectors such as
`Level1: { $: '&:is(h1)', preset: 'h1' }` as errors: `&:is(h1)` selects the
component root. Use a root `preset` state map to style a root heading, or
`$: 'h1'` to select descendant headings. Root pseudo-elements such as
`&::before` remain supported. See the [sub-element rule guide](docs/rules/valid-sub-element.md)
for both alternatives.

Keep a sub-element's `$` selector focused on the element's identity and position.
`tasty/no-state-in-selector` warns on conditions such as `img:not([width])`,
`button[disabled]`, and `>@:hover`. Express those conditions in property state
maps, using `@own(...)` for the sub-element's own state. Root states stay outside
`@own(...)`.

Tags, combinators, classes, IDs, exact `[data-element="Name"]` identities, and
pseudo-elements remain valid structural selectors. `:is()` and `:where()` may
group structural selectors, but conditions inside them still produce a warning:
`:where(picture)` is accepted, while `:where(img:not([width]))` is reported.
The rule does not autofix because moving a condition can change its scope and
the behavior of other properties. See the [rule guide](docs/rules/no-state-in-selector.md)
for examples and migration advice.

### Static values and intentional spreads

The recommended rules flag JavaScript-computed style values, including
identifiers, conditionals, function calls, computed keys, and template
interpolation. Use a Tasty state map with `mods` for discrete states, or a token
for a value that changes per instance. Literal CSS strings, token references,
and state maps are accepted.

Spreads in runtime style objects get a separate warning because they hide which
properties are defined and can make overrides hard to review. If a spread is
necessary, suppress just that line and explain why:

```js
const Card = tasty({
  styles: {
    // eslint-disable-next-line tasty/no-style-spread -- generated defaults are shared by all cards
    ...sharedStyles,
    fill: { '': '#surface', active: '#primary' },
  },
});
```

When a root style object contains two or more spreads, the rule reports one
composition warning at the first spread and recommends `mergeStyles`:

```ts
import { mergeStyles, type Styles } from '@tenphi/tasty';

// Warning: shallow composition can discard sub-element properties and states.
const finalStyles: Styles = { ...outerStyles, ...styles };

// Use Tasty's merge semantics, in the same override order.
const mergedStyles: Styles = mergeStyles(outerStyles, styles);
```

For example, spreading `Label: { fill: '#accent' }` over
`Label: { padding: '2x', fill: '#surface' }` loses `padding`; `mergeStyles`
preserves it. State maps without a default key extend inherited entries, while
maps with a `''` default deliberately replace them. This is a behavioral choice,
so the rule provides no automatic rewrite. If shallow replacement is intentional,
suppress the warning at the first spread with a reason. Single spreads and spreads
inside state maps, sub-elements or arrays retain the ordinary spread warning.

`tastyStatic()` still rejects spreads and dynamic expressions as errors because
its build-time extractor cannot evaluate them. An ESLint suppression does not
make a spread valid there. To make warnings fail CI until addressed or explicitly
suppressed, run ESLint with `--max-warnings=0`.

### Optional motion duration rule

Enable `tasty/no-raw-motion-duration` as a warning if your design system uses
tokens for animation timing and explicit CSS durations:

```js
import tasty from '@tenphi/eslint-plugin-tasty';

export default [
  tasty.configs.recommended,
  { rules: { 'tasty/no-raw-motion-duration': 'warn' } },
];
```

It checks `animation`, `animationDuration`, and `transitionDuration` in Tasty
style objects and JSX style props. It suggests configured `$…duration` tokens when
available. It never suggests removing a duration, since these properties do not
inherit Tasty's implicit transition timing. Zero, delays, and values based on
tokens are left alone. Lengths and widths remain covered by the separate
`consistent-token-usage` rule; valid custom units such as `x` and `bw` are fine.

### Animation and transition shorthands

Use Tasty's semantic `transition` value when defining a complete transition,
and the native CSS `animation` shorthand when defining a complete animation.
Tasty already supports both: `transition` uses semantic names and duration
tokens, while `animation` accepts tokens and tracks local keyframes. No
additional animation style handler is needed. Keep longhands such as
`transitionDuration`, `animationDuration`, and `animationTimeline` when changing
one part of an existing effect in a state or component extension.

`prefer-shorthand-property` deliberately leaves these motion longhands alone.
Replacing one with a shorthand can reset the other parts of the effect, including
an animation's timeline and range. The duration rules above still encourage
tokens wherever a duration is written.

## Intentional exceptions

The advisory rules describe preferred Tasty patterns. Third-party integrations
may require `style` or `className`, and edge cases may require instance `styles`.
One-off colors, exact pixel alignment, custom motion timing, generated runtime
styles, longhand overrides, and conditional selectors can also be intentional.
Their warnings explain both the preferred alternative and the local ignore path.

For an exception, use an explicit, rule-specific ESLint disable comment with a
reason immediately before the reported line:

```tsx
const floating = (
  // eslint-disable-next-line tasty/no-style-prop -- positioning library supplies these inline styles
  <Box style={positioningStyles} />
);
```

The comment acknowledges that usage; other rules on the same line and later
usages still report. In multiline JSX, target the line containing the reported
attribute or spread property. JSX child comments can use
`{/* eslint-disable-next-line tasty/no-classname-prop -- library requires this class */}`
immediately above the affected element when the attribute is on that next line.

Suppression uses ESLint's normal directives. The plugin does not enforce comment
reasons or infer exceptions automatically. A warning severity alone does not mean
the value is valid: checks for unknown names, malformed syntax, state order, and
static-extraction constraints still describe correctness issues. Verify those
against the runtime, configuration, or extractor before suppressing them.

## Component prop guidance

Both presets warn about three escape-hatch props on recognized Tasty components:

- `style`: define token references in the component's styles and provide dynamic values through `tokens`.
- `className`: keep styling in Tasty. For sub-element targeting, use `data-element="Name"` and the matching capitalized key in the parent's styles.
- `styles`: use `tokens` for dynamic values, `mods` for state changes, exposed style props or variants for supported customization, or a reusable `tasty(Component, { styles })` wrapper for structural overrides.

Warnings cover every explicit value shape, including variables, calls, conditional
expressions and null, plus visible keys in inline JSX object spreads. Replacing
these props requires choosing the component's token/state/extension contract, so
these rules provide guidance without automatic fixes.

Recognition uses local `const` Tasty/configured-options factory results, their
`const` aliases/sub-elements, and components imported from `importSources`. Add
your design-system module to `importSources` to enable checks on imported
components. Native elements, unrelated components, shadowed bindings, and mutable
aliases are excluded. Opaque spread bindings are not evaluated. Third-party
styling integrations and edge-case instance overrides need an explicit local
ignore with a reason, as described above.

## Value validation in JSX

Value rules also check consumer style props such as `<Box fill="red" gap="17px" />`.
This covers color and custom-property tokens, units, value syntax, booleans,
directional modifiers, radius shapes, presets, recipes, and motion durations.
Checks read string attributes, expression literals, static templates, state maps,
and visible branches of conditionals and logical expressions. They also traverse
nested sub-elements in shared styles and JSX `styles` / `*Styles` props, including
TypeScript `as`, `satisfies`, and non-null wrappers.

Individual props are detected by name: a known Tasty or CSS property, or an entry
in `config.styles`, on an uppercase component or member tag (`<UI.Box>`). This is
a heuristic, so an unrelated component with a matching non-style prop can need a
rule suppression. Native HTML/SVG attributes and React's singular `style` prop
are excluded. Bindings, calls, spreads, and interpolated templates are not evaluated;
these checks do not require or use TypeScript type services.

Automatic `var()` / `calc()` rewrites and Tasty semantic transition advice need
additional component evidence: a local `const` created by an imported `tasty()` or
configured options factory, or a component imported from a Tasty `importSources`
module. Shadowed bindings do not carry that evidence.

`consistent-token-usage` reports every nonzero pixel length, including `17px`,
`padding="8px 17px"`, `width="calc(100% - 17px)"`, and `gap={17}`. Numeric values
are checked only for enhanced handlers that convert them to pixels; unitless
properties such as `opacity` and `zIndex` are unaffected. Known equivalents still
have suggestions (`8px` → `1x`, radius `6px` → `1r`, border `1px` → `1bw`). These
assume the conventional scale defaults; review them against your design system.
Other pixels are report-only. Zero, token definitions, quoted CSS text, and URLs
are allowed. Quotes and URLs are also excluded from token and raw-color checks.
Range-based fixes are withheld when JavaScript escapes or JSX entities make
source offsets differ from the decoded value.

## Logical styles

Tasty 3.8 added one enhanced handler per logical axis/category pair, which the plugin
validates alongside the physical properties:

| Category | Block axis | Inline axis |
|---|---|---|
| Size | `blockSize` | `inlineSize` |
| Padding | `blockPadding` | `inlinePadding` |
| Margin | `blockMargin` | `inlineMargin` |
| Inset | `blockInset` | `inlineInset` |
| Scroll margin | `blockScrollMargin` | `inlineScrollMargin` |
| Scroll padding | `blockScrollPadding` | `inlineScrollPadding` |
| Border | `blockBorder` | `inlineBorder` |

```js
tasty({
  styles: {
    direction: 'rtl',
    inlinePadding: '1x start, 2x end',
    inlineBorder: '1bw solid #accent start',
    blockInset: '0 end',
  },
});
```

These take `start`/`end` modifiers (never physical sides), accept `true` for their
category default, and follow the same one-value-per-directional-group rule as their
physical counterparts.

### Migrating off the native CSS spellings

Tasty 3.8 stopped reading `paddingBlock`, `paddingInline`, `insetBlock`, `insetInline`,
`marginBlock`, `marginInline` and the scroll variants in its physical handlers. They stay
valid keys as ordinary CSS, so nothing breaks — but `prefer-shorthand-property` reports
each one with an **auto-fix** onto the enhanced style, so `eslint --fix` migrates a
codebase in one pass:

```diff
- paddingBlock: '1x 2x'
+ blockPadding: '1x 2x'
- insetInline: '0'
+ inlineInset: '0'
```

These are pure key renames: both keys emit the same declaration, which the test suite
asserts against the installed tasty rather than by hand.

Three groups are reported **without** a fix, because the rewrite is not equivalent — apply
them by hand:

| Native CSS | Suggested | Why no auto-fix |
|---|---|---|
| `paddingBlockStart`, `insetInlineEnd`, … | `blockPadding: '... start'` | The axis handler resets the edge you do not name, so the rewrite zeroes the opposite edge |
| `borderBlock`, `borderInlineColor`, … | `blockBorder` | Fills in the style and colour defaults `border-block` never had (`border-block: 1bw` renders nothing) |
| `minBlockSize`, `maxInlineSize`, … | `blockSize: 'min ...'` | Also emits `block-size` and `max-block-size` |

**Requires `@tenphi/tasty` >= 3.8.** The plugin never imports tasty, so it cannot adapt to
your installed version — and on 3.7 and below `blockPadding` is not a style tasty knows
(an unhandled camelCase key renders through to `block-padding`, which the browser drops).
The peer range floor is 3.8.0 for that reason.

## License

MIT
