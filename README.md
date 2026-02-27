# @tenphi/tasty-eslint-plugin

ESLint plugin for validating `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, and related APIs from `@tenphi/tasty`.

Catch typos, invalid syntax, and enforce best practices in your tasty style objects at lint time.

## Installation

```bash
pnpm add -D @tenphi/tasty-eslint-plugin
```

## Usage

### ESLint Flat Config (ESLint 9+)

```js
// eslint.config.js
import tasty from '@tenphi/tasty-eslint-plugin';

export default [
  tasty.configs.recommended,
  // your other configs...
];
```

For stricter checks:

```js
import tasty from '@tenphi/tasty-eslint-plugin';

export default [
  tasty.configs.strict,
];
```

### Manual Rule Configuration

```js
import tasty from '@tenphi/tasty-eslint-plugin';

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
| `tasty/valid-state-key` | error | Invalid state key syntax in style mappings |
| `tasty/valid-styles-structure` | error | Invalid styles object structure |
| `tasty/no-nested-state-map` | error | Nested state maps (not supported) |
| `tasty/no-important` | error | `!important` usage (breaks tasty specificity) |
| `tasty/valid-sub-element` | error | Sub-element values must be style objects |
| `tasty/valid-directional-modifier` | error | Directional modifiers on wrong properties |
| `tasty/valid-radius-shape` | error | Unknown radius shape keywords |
| `tasty/no-nested-selector` | warn | `&`-prefixed nested selectors (use sub-elements) |
| `tasty/static-no-dynamic-values` | error | Dynamic values in `tastyStatic()` |
| `tasty/static-valid-selector` | error | Invalid selector in `tastyStatic(selector, ...)` |

### Strict (includes all recommended rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `tasty/prefer-shorthand-property` | warn | Use tasty shorthand over native CSS |
| `tasty/valid-preset` | error | Unknown preset names |
| `tasty/valid-recipe` | error | Unknown recipe names |
| `tasty/valid-transition` | warn | Unknown transition names |
| `tasty/valid-custom-property` | warn | Unknown `$name` custom properties |
| `tasty/no-unknown-state-alias` | warn | Unknown `@name` state aliases |
| `tasty/no-duplicate-state` | warn | Duplicate state keys in mappings |
| `tasty/no-styles-prop` | warn | Direct `styles` prop usage |
| `tasty/no-raw-color-values` | warn | Raw hex/rgb instead of tokens |
| `tasty/consistent-token-usage` | warn | Raw px values when tokens exist |
| `tasty/no-runtime-styles-mutation` | warn | Dynamic values in style objects |

### Off by Default

| Rule | Description |
|------|-------------|
| `tasty/require-default-state` | Missing `''` key in state mappings |

## License

MIT
