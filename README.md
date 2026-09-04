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

## Rules

### Recommended

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/known-property` | warn | Unknown style property names (checked against the full MDN/W3C CSS property set) |
| `tasty/valid-value` | error | Malformed style values (unbalanced parens, !important) |
| `tasty/valid-color-token` | error | Invalid color token syntax or unknown tokens |
| `tasty/valid-custom-unit` | error | Unknown custom units |
| `tasty/valid-boolean-property` | error | `true` on properties that don't support it |
| `tasty/valid-state-key` | error | Invalid state key syntax in style mappings (including misuse of the `_` fallback floor) |
| `tasty/valid-styles-structure` | error | Invalid styles object structure, and the v2 at-rule key spellings (auto-fixable) |
| `tasty/no-nested-state-map` | error | Nested state maps (not supported) |
| `tasty/no-important` | error | `!important` usage (breaks tasty specificity) |
| `tasty/valid-sub-element` | error | Sub-element values must be style objects |
| `tasty/valid-directional-modifier` | error | Directional modifiers on wrong properties, and more than one value in a group that names directions. Physical properties take `top`/`right`/`bottom`/`left`, logical ones `start`/`end`, and mixing the two is reported in either direction |
| `tasty/valid-radius-shape` | error | Unknown radius shape keywords |
| `tasty/valid-preset` | error | Unknown preset names |
| `tasty/valid-recipe` | error | Unknown recipe names |
| `tasty/valid-transition` | warn | Unknown transition property names |
| `tasty/no-nested-selector` | warn | `&`-prefixed nested selectors (use sub-elements) |
| `tasty/static-no-dynamic-values` | error | Dynamic values in `tastyStatic()` |
| `tasty/static-valid-selector` | error | Invalid selector in `tastyStatic(selector, ...)` |
| `tasty/require-default-state` | error | Missing default (`''`) or fallback floor (`_`) key in state mappings (skipped for extending calls) |
| `tasty/no-own-at-root` | warn | `@own()` used at root level where it is redundant |
| `tasty/valid-default-state-order` | warn | Misplaced default (`''`) or redundant `''` when only `_` is present |
| `tasty/prefer-shorthand-property` | warn | Use Tasty shorthand instead of native CSS properties (`backgroundColor` → `fill`, `paddingBlock` → `blockPadding`, etc.). In an extension layer the rewrite is report-only and points at a token in the base component, and over a base you cannot edit it is skipped (see `ownedSources`) |
| `tasty/no-raw-color-values` | warn | Raw hex/rgb/`okhsl`/`okhst`/`oklch`/named colors instead of `#color` tokens |
| `tasty/no-raw-transition-duration` | warn | Hardcoded `transition` duration (`fill 0.2s`) instead of a duration token or tasty's default timing. Suggests each `$…-transition` / `$…duration` token in your config, or dropping the duration; a *delay* is left alone |
| `tasty/consistent-token-usage` | warn | Raw px values when custom units or tokens exist |
| `tasty/prefer-auto-calc` | warn | `calc(...)` instead of Tasty auto-calc `(...)` |
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
| `tasty/no-styles-prop` | warn | Direct `styles` prop usage |
| `tasty/no-runtime-styles-mutation` | warn | Dynamic values in style objects |

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
