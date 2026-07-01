# @tenphi/eslint-plugin-tasty

Linter plugin for validating `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, and related APIs from `@tenphi/tasty`.

Catch typos, invalid syntax, and enforce best practices in your tasty style objects at lint time.

Works with **ESLint** (9+) flat config and with **Oxlint** via [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) (`jsPlugins` alias `tasty`).

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
  states: ['@mobile', '@tablet', '@dark'],
  presets: ['h1', 'h2', 'h3', 't1', 't2', 't3'],
  recipes: ['card', 'elevated', 'reset'],
  importSources: ['@my-org/design-system'],
};
```

## Rules

### Recommended

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/known-property` | warn | Unknown style property names |
| `tasty/valid-value` | error | Malformed style values (unbalanced parens, !important) |
| `tasty/valid-color-token` | error | Invalid color token syntax or unknown tokens |
| `tasty/valid-custom-unit` | error | Unknown custom units |
| `tasty/valid-boolean-property` | error | `true` on properties that don't support it |
| `tasty/valid-state-key` | error | Invalid state key syntax in style mappings (including misuse of the `_` fallback floor) |
| `tasty/valid-styles-structure` | error | Invalid styles object structure |
| `tasty/no-nested-state-map` | error | Nested state maps (not supported) |
| `tasty/no-important` | error | `!important` usage (breaks tasty specificity) |
| `tasty/valid-sub-element` | error | Sub-element values must be style objects |
| `tasty/valid-directional-modifier` | error | Directional modifiers on wrong properties |
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
| `tasty/prefer-shorthand-property` | warn | Use Tasty shorthand instead of native CSS properties (`backgroundColor` → `fill`, etc.) |
| `tasty/no-raw-color-values` | warn | Raw hex/rgb colors instead of `#color` tokens |
| `tasty/consistent-token-usage` | warn | Raw px values when custom units or tokens exist |
| `tasty/prefer-auto-calc` | warn | `calc(...)` instead of Tasty auto-calc `(...)` |
| `tasty/prefer-custom-property-syntax` | warn | `var(--prop)` instead of `$prop` / `(#color, fallback)` |
| `tasty/prefer-hide` | warn | `display: 'none'` instead of `hide: true` |
| `tasty/prefer-directional-shorthand` | warn | 4-value `margin`/`padding` with zero placeholders instead of directional form |

### Strict (includes all recommended rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/valid-custom-property` | warn | Unknown `$name` custom properties |
| `tasty/valid-state-definition` | warn | Invalid state definition values in `configure()` or `tasty.config` |
| `tasty/no-unknown-state-alias` | warn | Unknown `@name` state aliases |
| `tasty/no-styles-prop` | warn | Direct `styles` prop usage |
| `tasty/no-runtime-styles-mutation` | warn | Dynamic values in style objects |

## License

MIT
