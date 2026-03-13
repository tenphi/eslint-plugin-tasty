# eslint-plugin-tasty — Specification

ESLint plugin for validating `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, and related APIs from `@tenphi/tasty`.

---

## Table of Contents

- [Goals](#goals)
- [Detection Scope](#detection-scope)
- [Validation Config](#validation-config)
- [Rules](#rules)
  - [Property Validation](#property-validation)
  - [Value Validation](#value-validation)
  - [State Validation](#state-validation)
  - [Structure Validation](#structure-validation)
  - [Best Practices](#best-practices)
  - [tastyStatic-specific](#tastystatic-specific)
- [Implementation Notes](#implementation-notes)

---

## Goals

1. Catch typos and invalid syntax in tasty style objects at lint time rather than at runtime.
2. Validate style values against the tasty parser grammar (tokens, units, functions, color references).
3. Enforce best practices from the tasty documentation.
4. Provide project-specific validation via a shared config file (`tasty.config.ts`).
5. Work with both runtime `tasty()` and build-time `tastyStatic()` APIs.

---

## Detection Scope

The plugin must detect style objects in the following locations:

### Function calls

| Call signature | Style object location |
|---|---|
| `tasty({ styles: { ... } })` | `styles` property of the options object |
| `tasty({ variants: { name: { ... } } })` | Each variant value object |
| `tasty(Component, { styles: { ... } })` | `styles` property of the second argument |
| `tastyStatic({ ... })` | First argument (when object) |
| `tastyStatic(base, { ... })` | Second argument |
| `tastyStatic('selector', { ... })` | Second argument (selector mode) |
| `useStyles({ ... })` | First argument |
| `useGlobalStyles('selector', { ... })` | Second argument |

### Import-aware detection

The plugin should verify that the call targets originate from `@tenphi/tasty` or `@tenphi/tasty/static` (or a configured alias). This avoids false positives from unrelated functions named `tasty`.

### Prop detection

Style values can appear as JSX props when a component exposes them via `styleProps`:

```jsx
const FlexibleBox = tasty({
  as: 'div',
  styles: { display: 'flex' },
  styleProps: ['gap', 'align', 'fill'],
});

// These are explicitly exposed — perfectly fine to use
<FlexibleBox gap="2x" align="center" fill="#surface" />
```

The plugin should validate style values in these JSX attribute positions:

| Pattern | Style object location |
|---|---|
| `<Component styles={{ ... }} />` | JSX `styles` attribute (full style object) |
| `<Component tabListStyles={{ ... }} />` | Any JSX attribute ending in `Styles` (full style object) |
| `<Component fill="#purple" padding="2x" />` | Individual style props (string values only) |

For individual style props, the plugin can validate the value syntax (color tokens, units, etc.) but needs to know which props are actually tasty style props. Two detection modes:

1. **Heuristic (no type info)** — validate any JSX attribute whose name matches a known tasty style property name (from the built-in list + `config.styles`). May produce false positives on components that have non-tasty props with the same name (e.g., native `color` on `<font>`).
2. **Type-aware (recommended)** — use the TypeScript type checker to see if the prop type originates from tasty's `Styles` interface. This also enables detecting arbitrary `Styles`-typed variables and expressions, not just call-site arguments.

### Type-aware detection

When the user enables typed linting (via `parserOptions.project` in their ESLint config), the plugin gains access to `@typescript-eslint/utils`'s type services. This unlocks precise detection of tasty style objects in **any** position, not just known call sites:

| Pattern | Detection |
|---|---|
| `const s: Styles = { ... }` | Variable with `Styles` type annotation |
| `obj satisfies Styles` | `satisfies` expression |
| `fn(styles: Styles)` | Function parameter typed as `Styles` |
| `<Component fill="..." />` | JSX prop typed as `StyleValue` |
| `tasty({ styles: { ... } })` | Call-site argument (works without types too) |

**Implementation approach:**

The `@typescript-eslint/utils` package provides `ESLintUtils.getParserServices(context)` which gives access to the TypeScript `checker`. For any AST node, you can resolve its type and check if it matches or extends `Styles` / `StyleValue` from `@tenphi/tasty`:

```ts
const services = ESLintUtils.getParserServices(context);
const type = services.getTypeAtLocation(node);
// Check if type is assignable to Styles
```

**Complexity:** Medium. The API is stable, well-documented, and used by many plugins (`@typescript-eslint` itself, `eslint-plugin-zod`, etc.). The main trade-off is performance — typed linting requires a full TypeScript program, making lint ~2-5x slower. This is standard for typed rules and most teams accept it.

**Graceful degradation:** All rules should work without type info using the heuristic call-site detection. Type info just improves precision. Rules can check `context.parserServices?.hasFullTypeInformation` to decide which detection path to use.

---

## Validation Config

The plugin reads its configuration from a `tasty.config.ts` (or `.js`, `.json`) file at the project root, similar to how the Babel plugin reads its config.

### Config type

```typescript
interface TastyValidationConfig {
  /**
   * Extend another config file or an npm package's config.
   * - Relative path: resolved relative to this config file.
   * - Package name: resolved via Node module resolution (looks for the package's
   *   default export or `tasty.config` entry in its `exports` map).
   * The extended config is merged first, then this config's values override.
   * @example '../tasty.config.ts'
   * @example '@my-org/design-tokens'
   */
  extends?: string;

  /**
   * Valid token names for validation and autocomplete.
   * Use # prefix for colors, $ prefix for custom properties.
   * Set to `false` to disable token validation entirely.
   * @example ['#primary', '#danger', '$spacing', '$gap']
   */
  tokens?: false | string[];

  /**
   * Valid custom unit names (in addition to built-in units: x, r, cr, bw, ow, fs, lh, sf).
   * Set to `false` to disable unit validation entirely.
   * @example ['vh', 'vw', 'cols']
   */
  units?: false | string[];

  /**
   * Valid custom function names (in addition to built-in CSS functions).
   * Set to `false` to disable function validation entirely.
   * @example ['okhsl', 'double']
   */
  funcs?: false | string[];

  /**
   * Valid predefined state alias names (must start with @).
   * @example ['@mobile', '@tablet', '@dark']
   */
  states?: string[];

  /**
   * Valid preset names for the `preset` style property.
   * @example ['h1', 'h2', 'h3', 't1', 't2', 't3', 'tag']
   */
  presets?: string[];

  /**
   * Valid recipe names for the `recipe` style property.
   * @example ['card', 'elevated', 'reset', 'input']
   */
  recipes?: string[];

  /**
   * Custom style property names added via configure({ handlers }).
   * Suppresses "unknown property" warnings for these names.
   * @example ['myGradient', 'customLayout', 'brandBorder']
   */
  styles?: string[];


  /**
   * Import sources to recognize as tasty imports.
   * Defaults to ['@tenphi/tasty', '@tenphi/tasty/static'].
   * @example ['@cube-dev/ui-kit', '@my-org/design-system']
   */
  importSources?: string[];
}
```

### Changes from `TastyExtensionConfig`

- Renamed to `TastyValidationConfig` (shared between ESLint plugin and future tooling).
- Added `recipes` field — validates `recipe` property values.
- Added `importSources` field — recognizes custom re-exports of tasty.
- Kept `extends` for config composition.
- Removed `presetDescriptions` and `stateDescriptions` — those are IDE tooltip features, not relevant for lint diagnostics.

### Config resolution

1. Look for `tasty.config.ts`, `tasty.config.js`, `tasty.config.mjs`, or `tasty.config.json` in the project root (nearest directory with `package.json`).
2. If `extends` is set, resolve and load the parent config first, then merge:
   - **Relative path** (starts with `.` or `/`): resolved relative to the current config file's directory.
   - **Package name** (anything else): resolved via `require.resolve()` / Node module resolution. The package should export a `TastyValidationConfig` as its default export, or provide a `tasty.config` entry in its `exports` map.
3. `extends` chains are followed recursively (a parent config can also extend another).
4. Arrays are concatenated (deduped). `false` overrides parent arrays. Objects are shallow-merged.

### Config reloading

The config must be re-read when the user edits it. ESLint does not natively watch config files, so this depends on the environment:

- **CLI (`eslint .`)** — config is read once per run. No reloading needed; the user simply re-runs the command.
- **IDE integration (VS Code, Cursor, etc.)** — ESLint server typically re-lints on file save. The plugin should **not** cache the resolved config across lint runs. Instead, load and resolve the config on each `Program` node visit (once per file), and cache it in-memory only for the duration of that file's lint pass. This ensures edits to `tasty.config.ts` take effect on the next save/lint cycle without restarting the ESLint server.
- **Extended configs** — when `extends` is used, all referenced config files must be re-read, not just the root one.

**Implementation:** The config loader should use a file-mtime check: read the config file's `mtime`, and only re-parse if it changed since the last read. This avoids re-parsing on every file while still picking up edits promptly.

---

## Rules

### Property Validation

#### `tasty/known-property`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — straightforward AST key matching against a static list

Warns when a style property name is not recognized as a valid tasty property or CSS property.

**Known tasty properties** (built-in):
`display`, `font`, `preset`, `hide`, `whiteSpace`, `opacity`, `transition`,
`gridArea`, `order`, `gridColumn`, `gridRow`, `placeSelf`, `alignSelf`, `justifySelf`, `zIndex`, `margin`, `inset`, `position`,
`padding`, `paddingInline`, `paddingBlock`, `overflow`, `scrollbar`, `textAlign`,
`border`, `radius`, `shadow`, `outline`,
`color`, `fill`, `fade`, `image`,
`textTransform`, `fontWeight`, `fontStyle`,
`width`, `height`, `flexBasis`, `flexGrow`, `flexShrink`, `flex`,
`flow`, `placeItems`, `placeContent`, `alignItems`, `alignContent`, `justifyItems`, `justifyContent`, `align`, `justify`, `gap`, `columnGap`, `rowGap`, `gridColumns`, `gridRows`, `gridTemplate`, `gridAreas`,
`recipe`, `textOverflow`

**Also valid:**
- Any CSS property name (via a CSS property list).
- Keys starting with uppercase letter → sub-element (separate rule).
- Keys starting with `@` → special properties (`@keyframes`, `@properties`).
- Keys starting with `$` or `$$` → custom CSS property definition (`$name` → `--name`, `$$name` → raw `--name` reference for transitions).
- Keys starting with `#` or `##` → color token definition (`#name` → `--name-color`, `##name` → raw `--name-color` reference for transitions).
- Config `styles` list → custom handler properties.

**Deliberately excluded:**
- Keys starting with `&` → nested selectors. These are legacy syntax; sub-element selectors should be used instead (see `tasty/no-nested-selector`).

**Examples:**
```js
// ✅ Valid
tasty({ styles: { fill: '#purple', padding: '2x' } });

// ⚠️ Warning: Unknown style property 'colour'
tasty({ styles: { colour: '#purple' } });

// ⚠️ Warning: Unknown style property 'boarder'
tasty({ styles: { boarder: true } });
```

---

#### `tasty/no-nested-selector`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — detect keys starting with `&`

Discourages `&`-prefixed nested selectors in style objects. This is legacy syntax — sub-element selectors (uppercase keys with `data-element` targeting) should be used instead, as they are more explicit and composable.

**Examples:**
```js
// ⚠️ Warning: Avoid nested selectors. Use sub-element styling instead.
tasty({
  styles: {
    '& img': { width: '100%' },
    '&:hover': { fill: '#blue' },
  },
});

// ✅ Preferred — sub-element selector
tasty({
  styles: {
    Image: { width: '100%' },
  },
});

// ✅ Preferred — state mapping for pseudo-classes
tasty({
  styles: {
    fill: { '': '#white', ':hover': '#blue' },
  },
});
```

---

#### `tasty/prefer-shorthand-property`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — simple key-to-key mapping lookup

Suggests the tasty shorthand when a native CSS property with a tasty alternative is used.

**Mapping:**

| Native CSS | Tasty alternative |
|---|---|
| `backgroundColor` | `fill` |
| `background` | `fill` (when value is a simple color) |
| `borderColor` | `border` |
| `borderWidth` | `border` |
| `borderStyle` | `border` |
| `borderTop` | `border: '... top'` |
| `borderRight` | `border: '... right'` |
| `borderBottom` | `border: '... bottom'` |
| `borderLeft` | `border: '... left'` |
| `borderRadius` | `radius` |
| `maxWidth` | `width: 'max ...'` |
| `minWidth` | `width: 'min ...'` |
| `maxHeight` | `height: 'max ...'` |
| `minHeight` | `height: 'min ...'` |
| `flexDirection` | `flow` |
| `flexWrap` | `flow` |
| `flexFlow` | `flow` |
| `gridAutoFlow` | `flow` |
| `outlineOffset` | `outline: '... / offset'` |
| `paddingTop` | `padding: '... top'` |
| `paddingRight` | `padding: '... right'` |
| `paddingBottom` | `padding: '... bottom'` |
| `paddingLeft` | `padding: '... left'` |
| `marginTop` | `margin: '... top'` |
| `marginRight` | `margin: '... right'` |
| `marginBottom` | `margin: '... bottom'` |
| `marginLeft` | `margin: '... left'` |
| `fontSize` | `preset` |
| `fontWeight` | `preset` (with `strong` modifier) |
| `lineHeight` | `preset` (with `tight` modifier) |
| `boxShadow` | `shadow` |

**Examples:**
```js
// ⚠️ Prefer: fill: '#purple'
tasty({ styles: { backgroundColor: '#purple' } });

// ⚠️ Prefer: radius: '1r'
tasty({ styles: { borderRadius: '6px' } });
```

---

### Value Validation

#### `tasty/valid-value`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — uses a standalone value parser with explicit token classification

Parses every string style value through the value parser and validates the result against per-property expectations. This is the foundational value validation rule that catches malformed values at the token level.

**Excluded properties:** `recipe` (validated by `valid-recipe`), `@keyframes`, `@properties` (structural keys).

**How it works:**

1. Parse the value string via `StyleParser.process(value)`.
2. Inspect the resulting `groups` — each group has `colors`, `values`, and `mods` arrays.
3. Compare against per-property expectations:
   - Properties that don't accept modifiers (`fill`, `color`, `opacity`, `width`, `height`, etc.) should have no `Mod` tokens. Any `Mod` token means something wasn't recognized.
   - Properties that accept specific modifiers (`border`, `padding`, `radius`, etc.) should only have `Mod` tokens from a known set.
   - Properties that don't accept colors (`padding`, `margin`, `gap`, `width`, etc.) should have no `Color` tokens.

**What it catches:**

```js
// ❌ Error: Unrecognized token 'purle' in fill value
fill: '#purle'  // typo — parser sees '#purle' but it's in Mod bucket if not a valid token

// ❌ Error: Unrecognized token 'topp' in padding value
padding: '2x topp'  // 'topp' falls into Mod, not in known modifier set

// ❌ Error: Unbalanced parentheses in value
fill: 'rgb(255, 0, 0'  // parser warns about unmatched parens

// ✅ Valid — parser handles all these correctly
fill: '#purple.5'
padding: '2x top bottom'
border: '1bw solid #red top'
width: 'min 200px'
```

**Relationship to other value rules:**

`valid-value` provides the "does it parse?" baseline. The more specific rules (`valid-color-token`, `valid-custom-unit`, etc.) add config-aware existence checks on top:

| Check | Rule |
|---|---|
| "Does this value parse without unknown tokens?" | `valid-value` |
| "Is `#purple` in the configured token list?" | `valid-color-token` |
| "Is `3cols` using a configured custom unit?" | `valid-custom-unit` |
| "Is `$spacign` in the configured token list?" | `valid-custom-property` |

---

#### `tasty/valid-color-token`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — regex-based token parsing + config lookup

Validates color token syntax and (optionally) existence.

**Checks:**
1. **Syntax validation** — color tokens must match `#name` or `#name.N` or `#name.NN` or `#name.100` pattern, where the opacity suffix is a number 0–100. Always enabled.
2. **Existence validation** — warns when a `#token` is not found in any of:
   - `config.tokens` (if set as an array)
   - `#`-prefixed keys defined in the same styles object (e.g., a sibling `'#accent': '...'` key)
   - `#`-prefixed keys in a `tastyStatic(':root', { ... })` call in the same file
   
   Disabled when `config.tokens` is `false`.
3. **Double-prefix** — `##name` is valid (resolves to `--name-color` for use in transitions). Existence is checked the same way as `#name`.

**Valid syntax:**
- `#purple` — full opacity
- `#purple.5` — 50% opacity
- `#purple.05` — 5% opacity
- `#purple.100` — 100% opacity
- `#current` — reserved, maps to `currentcolor`
- `#current.5` — `currentcolor` at 50%
- `##purple` — raw `--purple-color` reference (for transitions/`@property`)
- `(#primary, #secondary)` — fallback syntax
- `#name.$prop` — dynamic opacity from CSS custom property

**Invalid syntax:**
- `#` — empty token name
- `#purple.` — trailing dot with no number
- `#purple.150` — opacity > 100
- `#purple.-5` — negative opacity
- `#PURPLE` — uppercase token names (tokens are lowercase-kebab-case by convention; configurable)

**Examples:**
```js
// ❌ Error: Invalid color token opacity '.150' (must be 0-100)
fill: '#purple.150'

// ⚠️ Warning: Unknown color token '#pruple' (not in config)
fill: '#pruple'
```

---

#### `tasty/valid-custom-unit`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — regex matching for `{number}{unit}` patterns

Validates that custom units in values are recognized.

**Built-in units:** `x`, `r`, `cr`, `bw`, `ow`, `fs`, `lh`, `sf`

**Standard CSS units (always valid):** `px`, `em`, `rem`, `%`, `vw`, `vh`, `vmin`, `vmax`, `ch`, `ex`, `cm`, `mm`, `in`, `pt`, `pc`, `fr`, `deg`, `rad`, `turn`, `grad`, `s`, `ms`, `dpi`, `dpcm`, `dppx`, `svw`, `svh`, `lvw`, `lvh`, `dvw`, `dvh`, `cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, `cqmax`, `cap`, `ic`, `lh`, `rlh`, `vi`, `vb`

Additional units from `config.units` are also accepted.

**Examples:**
```js
// ✅ Valid
padding: '2x'
radius: '1r'
border: '1bw'

// ❌ Error: Unknown unit 'q' in '2q'
padding: '2q'

// ✅ Valid (if config.units includes 'cols')
width: '3cols'
```

---

#### `tasty/valid-custom-property`

**Severity:** warning (default)
**Complexity:** Medium
**Feasibility:** High — regex matching for `$name` patterns + config lookup

Validates `$name` custom property references.

**Checks:**
1. **Syntax** — must match `$[a-z][a-z0-9-]*` pattern.
2. **Existence** — warns when a `$token` is not found in any of:
   - `config.tokens` (if set as an array)
   - `$`-prefixed keys defined in the same styles object (e.g., a sibling `'$spacing': '...'` key)
   - `$`-prefixed keys in a `tastyStatic(':root', { ... })` call in the same file
   
   Disabled when `config.tokens` is `false`.
3. **Fallback syntax** — validates `($name, fallback)` parenthesized form.
4. **Double-prefix** — `$$name` is valid (resolves to `--name` for transitions). Existence is checked the same way as `$name`.

**Examples:**
```js
// ✅ Valid
padding: '$spacing'
transition: '$$gradient-angle 0.3s'

// ⚠️ Warning: Unknown custom property '$spacign'
padding: '$spacign'
```

---

#### `tasty/valid-preset`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — simple string matching against config list

Validates `preset` property values against `config.presets`.

**Parsing:**
The preset value is a space-separated string: `name [modifier...]`
- First token is the preset name.
- Remaining tokens are modifiers: `strong`, `italic`, `tight`, or other project-specific modifiers.
- `preset={true}` is always valid (means "use defaults").

**Checks:**
1. If `config.presets` is set, validate the preset name is in the list.
2. Validate modifiers are from the known set: `strong`, `italic`, `tight` (could be extensible via config).

**Examples:**
```js
// ✅ Valid (if config.presets includes 'h1')
preset: 'h1'
preset: 'h1 strong'
preset: 't2 italic'

// ❌ Error: Unknown preset 'heading1'
preset: 'heading1'
```

**Skipped:** when `config.presets` is not set, only modifier validation is performed.

---

#### `tasty/valid-recipe`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — simple string matching against config list

Validates `recipe` property values against `config.recipes`.

**Parsing:**
The recipe value is a space-separated list of recipe names, optionally split by `/` for post-merge recipes. `none` is a reserved keyword meaning "no base recipes".

```
recipe: 'card elevated'            → ['card', 'elevated']
recipe: 'reset input / autofill'   → pre: ['reset', 'input'], post: ['autofill']
recipe: 'none / autofill'          → pre: [], post: ['autofill']
```

**Checks:**
1. If `config.recipes` is set, validate each recipe name is in the list.

**Examples:**
```js
// ✅ Valid
recipe: 'card elevated'

// ❌ Error: Unknown recipe 'cards'
recipe: 'cards'
```

**Skipped:** when `config.recipes` is not set.

---

#### `tasty/valid-transition`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — string splitting + known list lookup

Validates the `transition` property value uses valid semantic transition names or raw CSS properties.

**Known semantic transitions:** `fade`, `fill`, `border`, `radius`, `shadow`, `preset`, `gap`, `theme`, `color`, `outline`, `dimension`, `flow`, `inset`

**Parsing:**
The value is comma-separated, each entry is `name [duration] [easing] [delay]`.

**Checks:**
1. First token of each comma-group should be a known semantic name, a CSS property name, or a `$$name` custom property reference.

**Examples:**
```js
// ✅ Valid
transition: 'fill 0.2s'
transition: 'theme 0.3s ease'
transition: '$$my-prop 0.2s'

// ⚠️ Warning: Unknown transition name 'colour'
transition: 'colour 0.2s'
```

---

#### `tasty/no-raw-color-values`

**Severity:** warning (default), off by default
**Complexity:** Medium
**Feasibility:** Medium — requires parsing color values from arbitrary strings

Suggests using color tokens instead of raw hex/rgb values in style properties that accept colors.

**Checks:**
1. Detect raw hex colors: `#fff`, `#ffffff`, `#rrggbb`, `#rrggbbaa`
2. Detect raw `rgb()`, `rgba()`, `hsl()`, `hsla()` calls (not in token-defining context like `:root`)
3. Suggest using a named color token instead.

**Exceptions:**
- Values inside `tastyStatic(':root', { ... })` or root-level token definitions.
- Values that are clearly hex color codes (6/8 hex digits) are flagged; short `#abc` is ambiguous with tokens but tokens don't use hex chars only.

**Disambiguation:** The rule needs to distinguish `#ff0000` (hex color) from `#primary` (token). Heuristic: if the name after `#` consists entirely of hex-valid characters and is 3, 4, 6, or 8 characters long, treat as a raw hex color.

**Examples:**
```js
// ⚠️ Warning: Use a color token instead of raw hex '#ff0000'
fill: '#ff0000'

// ✅ OK — this is a token
fill: '#danger'
```

---

#### `tasty/valid-boolean-property`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — property name lookup against a known set

Validates that `true` / `false` literal values are only used on properties that support them.

**Properties supporting `true`:**
`border`, `radius`, `padding`, `gap`, `fill`, `color`, `outline`, `width`, `height`, `hide`, `preset`, `font`, `scrollbar`

**Properties supporting `false`:**
All properties (means "tombstone — remove this property entirely").

**Examples:**
```js
// ✅ Valid
border: true
radius: true
padding: true

// ❌ Error: Property 'textAlign' does not accept boolean values
textAlign: true
```

---

#### `tasty/valid-directional-modifier`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — parse value string, check last tokens against modifier list per property

Validates that directional modifiers (`top`, `right`, `bottom`, `left`) are used only on properties that support them.

**Properties supporting directional modifiers:**
- `border` — `top`, `right`, `bottom`, `left`
- `radius` — `top`, `right`, `bottom`, `left`, `top-left`, `top-right`, `bottom-left`, `bottom-right`
- `padding` — `top`, `right`, `bottom`, `left`
- `margin` — `top`, `right`, `bottom`, `left`
- `outline` — (no directional modifiers)
- `fade` — `top`, `right`, `bottom`, `left`

**Examples:**
```js
// ✅ Valid
border: '1bw #red top'
padding: '2x left right'

// ❌ Error: Property 'fill' does not support directional modifiers
fill: '#purple top'
```

---

#### `tasty/valid-radius-shape`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — simple string matching

Validates special shape keywords used with the `radius` property.

**Valid shapes:** `round`, `ellipse`, `leaf`, `backleaf`

**Examples:**
```js
// ✅ Valid
radius: 'round'
radius: 'ellipse'

// ❌ Error: Unknown radius shape 'circle'. Did you mean 'round'?
radius: 'circle'
```

---

### State Validation

#### `tasty/valid-state-key`

**Severity:** error (default)
**Complexity:** Medium-High
**Feasibility:** High — regex-based parsing of state key syntax

Validates the syntax of state keys in style mapping objects.

**Valid state key patterns:**
- `''` — default state
- Boolean modifier: `hovered`, `pressed`, `disabled`, etc.
- Value modifier: `theme=danger`, `size=large`, `size^=sm` (with operators `=`, `^=`, `$=`, `*=`)
- Pseudo-class: `:hover`, `:focus`, `:focus-visible`, `:nth-child(2n+1)`, etc.
- Class: `.active`, `.highlighted`
- Attribute: `[aria-expanded="true"]`, `[data-mode]`
- Combined with operators: `hovered & .active`, `!disabled`, `(loading | processing) & !readonly`
- Advanced states: `@media(...)`, `@root(...)`, `@(...)`, `@own(...)`, `@starting`, `@supports(...)`
- Predefined aliases: `@mobile`, `@tablet`, etc. (from config)

**Checks:**
1. **Syntax** — the key must parse as a valid state expression. Validate operator usage (`&`, `|`, `^`, `!`), balanced parentheses, and valid tokens.
2. **Alias existence** — if a `@name` key (not a built-in like `@media`, `@root`, `@supports`, `@own`, `@starting`) is used, and `config.states` is set, warn if the alias is not in the list.
3. **@own context** — `@own(...)` is only valid inside sub-element style objects (capitalized keys). Warn if used at root level.
4. **Dimension shorthands** — inside `@media(...)` and `@(...)`, validate that `w`, `h`, `is`, `bs` are used correctly as dimension shorthands.

**Examples:**
```js
// ✅ Valid
fill: { '': '#white', 'hovered': '#gray.05' }
fill: { '': '#white', ':hover': '#gray.05' }
fill: { '': '#white', '@mobile': '#gray' }

// ❌ Error: Invalid state key syntax 'hovred' — did you mean 'hovered'?
// (fuzzy matching for common modifier names is a nice-to-have)
fill: { '': '#white', 'hovred': '#gray' }

// ⚠️ Warning: Unknown state alias '@mobil' (not in config)
fill: { '': '#white', '@mobil': '#gray' }

// ❌ Error: @own() can only be used inside sub-element styles
fill: { '': '#white', '@own(hovered)': '#gray' }
```

---

#### `tasty/no-unknown-state-alias`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — simple prefix check + config lookup

Warns when a `@name` state alias is used that isn't in the config and isn't a built-in prefix.

**Built-in prefixes (always valid):** `@media`, `@root`, `@own`, `@supports`, `@starting`, `@keyframes`, `@properties`

**Built-in container query syntax (always valid):** `@(` prefix

**Examples:**
```js
// ⚠️ Warning: Unknown state alias '@drak'. Did you mean '@dark'?
padding: { '': '4x', '@drak': '2x' }
```

**Skipped:** when `config.states` is not set.

---

#### `tasty/valid-state-definition`

**Severity:** warning (default)
**Complexity:** Medium
**Feasibility:** High — uses the state key parser to validate definition values

Validates state definition values (the right-hand side of state aliases in `configure()` or `tasty.config`).

**Detection:**
- `configure({ states: { '@mobile': '@media(w < 768px)' } })` — validates each state definition value
- State definitions in `tasty.config.ts` — validates via config loading

**Checks:**
1. State alias keys must start with `@`.
2. State definition values must be valid state expressions (parsed by the state key parser).

**Examples:**
```js
// ✅ Valid
configure({
  states: {
    '@mobile': '@media(w < 768px)',
    '@dark': '@root(theme=dark)',
  },
});

// ❌ Error: Invalid state key in definition
configure({
  states: {
    '@mobile': '@media()',  // empty query
  },
});

// ❌ Error: State alias must start with '@'
configure({
  states: {
    'mobile': '@media(w < 768px)',  // missing @
  },
});
```

---

#### `tasty/require-default-state`

**Severity:** warning (default), off by default
**Complexity:** Low
**Feasibility:** High — check for `''` key in state mapping objects

Warns when a state mapping object doesn't have a `''` (default) key. Without a default, the property has no value in the normal state.

**Exceptions:**
- When extending a component via `tasty(Base, { styles: { ... } })`, omitting `''` means "extend mode" (keep parent's default). This is intentional and should not warn. Detecting this requires checking the calling context.
- Properties inside `variants` objects (variants don't need defaults).

**Examples:**
```js
// ⚠️ Warning: State mapping for 'fill' has no default ('') value
tasty({
  styles: {
    fill: {
      'hovered': '#blue',
    }
  }
});

// ✅ OK — extending parent, intentionally no default
tasty(Button, {
  styles: {
    fill: {
      'loading': '#yellow',
    }
  }
});
```

---

### Structure Validation

#### `tasty/valid-sub-element`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — key name pattern matching

Validates sub-element key format in style objects.

**Rules:**
1. Sub-element keys must start with an uppercase letter: `Title`, `Content`, `Icon`.
2. The value must be a style object (not a string or number).
3. Nested sub-elements inside sub-elements are valid (e.g., `Title: { Icon: { ... } }`).

**Special non-sub-element keys that start with uppercase:**
None — all uppercase-starting keys in a styles object are treated as sub-elements.

**Nested selector syntax:**
Keys starting with `& ` or `&` followed by a CSS combinator are nested selectors, not sub-elements:
- `& img` — descendant selector
- `&:hover` — pseudo-class on self
- `& > .child` — child combinator

**Examples:**
```js
// ✅ Valid
styles: {
  Title: { preset: 'h3' },
  Content: { color: '#text' },
}

// ❌ Error: Sub-element value must be a style object
styles: {
  Title: '#purple',
}
```

---

#### `tasty/no-nested-state-map`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — recursive AST inspection

Prevents state mapping objects inside state mapping objects.

A state map is an object where keys are state expressions and values are style values. Nesting one state map inside another is invalid — the tasty parser doesn't support it.

**Examples:**
```js
// ❌ Error: Nested state maps are not allowed
fill: {
  '': '#white',
  'hovered': {
    '': '#blue',       // ← this is a nested state map, not valid
    'pressed': '#red',
  },
}

// ✅ Valid — use combined states instead
fill: {
  '': '#white',
  'hovered': '#blue',
  'hovered & pressed': '#red',
}
```

---

#### `tasty/valid-styles-structure`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — AST shape validation

Validates the overall structure of the styles object passed to tasty APIs.

**Checks:**
1. Top-level keys must be valid property names, sub-element names, or special keys (`@keyframes`, `@properties`, `recipe`).
2. State mapping keys at the top level are invalid — state maps go inside property values, not as top-level keys.
3. `@keyframes` value must be an object of `{ name: { step: styles } }`.
4. `@properties` value must be an object of `{ name: { syntax, inherits, initialValue } }`.
5. `recipe` value must be a string.

**Common mistake this catches:**
```js
// ❌ Error: State keys at top level are not valid style properties
tastyStatic({
  '': { fill: '#white' },      // ← wrong! This isn't how state maps work
  ':hover': { fill: '#gray' }, // ← wrong! State maps go per-property
});

// ✅ Correct
tastyStatic({
  fill: {
    '': '#white',
    ':hover': '#gray',
  },
});
```

---

#### `tasty/no-duplicate-state`

**Severity:** warning (default)
**Complexity:** Low
**Feasibility:** High — duplicate key detection in object literals

Warns when the same state key appears more than once in a style mapping. JavaScript objects silently use the last value for duplicate keys, which is likely a mistake.

**Note:** ESLint core already has `no-dupe-keys`, but this rule provides tasty-specific context in the error message and handles computed keys that resolve to the same state.

**Examples:**
```js
// ⚠️ Warning: Duplicate state key 'hovered'
fill: {
  '': '#white',
  'hovered': '#blue',
  'hovered': '#red', // ← last one wins, likely a mistake
}
```

---

### Best Practices

#### `tasty/no-styles-prop`

**Severity:** warning (default), off by default
**Complexity:** Low
**Feasibility:** High — detect `styles` JSX attribute with object literal value

Discourages using the `styles` prop directly on components. The tasty best practice is to create a styled wrapper via `tasty(Component, { styles })` instead.

**Examples:**
```jsx
// ⚠️ Warning: Avoid using `styles` prop directly. Create a styled wrapper instead.
<Button styles={{ fill: '#red' }}>Delete</Button>

// ✅ Preferred
const DangerButton = tasty(Button, { styles: { fill: '#red' } });
<DangerButton>Delete</DangerButton>
```

---

#### `tasty/no-important`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — string search for `!important` in value strings

Disallows `!important` in tasty style values. The tasty system uses specificity management via doubled selectors and state ordering — `!important` breaks this system.

**Examples:**
```js
// ❌ Error: Do not use !important in tasty styles
fill: '#red !important'
```

---

#### `tasty/consistent-token-usage`

**Severity:** warning (default), off by default
**Complexity:** Medium
**Feasibility:** Medium — requires parsing values and comparing against known token equivalents

Suggests using design tokens and custom units instead of raw CSS values when a matching token exists.

**Checks:**
1. `8px` → suggest `1x` (when gap = 8px)
2. `16px` → suggest `2x`
3. `6px` (in radius context) → suggest `1r`
4. `1px` (in border context) → suggest `1bw`
5. Raw color values when a matching token exists.

**Configuration:**
Requires knowing the resolved token values, which may come from the tasty config or be specified directly in the ESLint rule options.

---

#### `tasty/no-runtime-styles-mutation`

**Severity:** warning (default)
**Complexity:** High
**Feasibility:** Medium — requires data-flow analysis to detect dynamic style objects

Warns when the `styles` object passed to `tasty()` or `tastyStatic()` contains runtime-computed values (variables, function calls, ternaries, etc.).

Tasty style values should be static and known at write time. Dynamic behavior should be achieved via modifiers (`mods` prop), tokens (`tokens` prop), or CSS custom properties.

**Checks:**
1. Detect non-literal values in style objects (template literals, variables, function calls).
2. Detect conditional expressions in style values.
3. Allow `@inherit`, `null`, `false`, `true` as known special values.

**Examples:**
```js
// ⚠️ Warning: Style values should be static
tasty({
  styles: {
    fill: isActive ? '#blue' : '#gray', // ← dynamic
  },
});

// ✅ Correct — use state mapping
tasty({
  styles: {
    fill: {
      '': '#gray',
      'active': '#blue',
    },
  },
});
```

---

### tastyStatic-specific

#### `tasty/static-no-dynamic-values`

**Severity:** error (default)
**Complexity:** Medium
**Feasibility:** High — detect non-literal AST nodes in `tastyStatic()` calls

Ensures all values in `tastyStatic()` calls are static (string literals, number literals, booleans, `null`). Since `tastyStatic` is transformed at build time by the Babel plugin, dynamic values will cause build failures.

This is a stricter version of `no-runtime-styles-mutation` specific to `tastyStatic()`.

**Checks:**
1. All property values must be literals, objects (for state maps), or arrays.
2. No variable references, template literals, function calls, or expressions.
3. Object values (state maps) must also contain only literals.

**Examples:**
```js
// ❌ Error: tastyStatic values must be static
const size = '2x';
tastyStatic({ padding: size });

// ❌ Error: tastyStatic values must be static
tastyStatic({ padding: `${base}x` });

// ✅ Valid
tastyStatic({ padding: '2x' });
tastyStatic({ padding: { '': '2x', '@mobile': '1x' } });
```

---

#### `tasty/static-valid-selector`

**Severity:** error (default)
**Complexity:** Low
**Feasibility:** High — validate first argument is a valid CSS selector string

Validates the selector string in `tastyStatic(selector, styles)` calls.

**Checks:**
1. The selector must be a string literal.
2. Basic CSS selector syntax validation (no empty string, balanced brackets, valid characters).
3. Common selectors are always valid: tag names, `.class`, `#id`, `:pseudo`, `[attr]`, and combinators.

**Examples:**
```js
// ✅ Valid
tastyStatic('body', { fill: '#dark' });
tastyStatic('.heading', { preset: 'h1' });
tastyStatic(':root', { '$gap': '8px' });

// ❌ Error: Invalid CSS selector ''
tastyStatic('', { fill: '#dark' });
```

---

## Implementation Notes

### Project Setup

- **Package name:** `eslint-plugin-tasty`
- **ESLint version:** ESLint 9+ (flat config), with backward compatibility for ESLint 8 (legacy `.eslintrc`).
- **Language:** TypeScript
- **Test framework:** Vitest (consistent with tasty ecosystem)
- **Parser:** Use `@typescript-eslint/parser` for TypeScript/JSX support. The plugin itself should work with both JS and TS files.

### Recommended Configs

The plugin should export preset configurations:

```js
// Minimal — just catch errors
'plugin:tasty/recommended': {
  'tasty/known-property': 'warn',
  'tasty/valid-value': 'error',
  'tasty/valid-color-token': 'error',
  'tasty/valid-custom-unit': 'error',
  'tasty/valid-boolean-property': 'error',
  'tasty/valid-state-key': 'error',
  'tasty/valid-styles-structure': 'error',
  'tasty/no-nested-state-map': 'error',
  'tasty/no-important': 'error',
  'tasty/valid-sub-element': 'error',
  'tasty/valid-directional-modifier': 'error',
  'tasty/valid-radius-shape': 'error',
  'tasty/no-nested-selector': 'warn',
  'tasty/static-no-dynamic-values': 'error',
  'tasty/static-valid-selector': 'error',
}

// Strict — recommended + best practices
'plugin:tasty/strict': {
  // ...all recommended rules...
  'tasty/prefer-shorthand-property': 'warn',
  'tasty/valid-preset': 'error',
  'tasty/valid-recipe': 'error',
  'tasty/valid-transition': 'warn',
  'tasty/valid-custom-property': 'warn',
  'tasty/no-unknown-state-alias': 'warn',
  'tasty/no-duplicate-state': 'warn',
  'tasty/no-styles-prop': 'warn',
  'tasty/no-raw-color-values': 'warn',
  'tasty/consistent-token-usage': 'warn',
  'tasty/no-runtime-styles-mutation': 'warn',
  'tasty/valid-state-definition': 'warn',
}
```

### AST Detection Strategy

The core challenge is reliably detecting which object literals represent tasty style objects.

The plugin uses two detection modes, falling back gracefully:

**Mode 1: Type-aware (when `parserOptions.project` is set)**

Use the TypeScript type checker to resolve types. Any object expression whose type is assignable to `Styles` (or whose individual properties match `StyleValue`) is treated as a style context. This catches all patterns: call sites, typed variables, `satisfies` expressions, function parameters, and JSX props.

**Mode 2: Import tracking + call-site analysis (fallback)**

1. Track imports from tasty sources (`@tenphi/tasty`, configured aliases).
2. When a tracked function is called, mark the relevant argument as a "style context."
3. Within a style context, apply property/value validation rules.
4. Nested objects within a style context are either sub-elements (uppercase key) or state maps (inside a property value).
5. For JSX props, use the heuristic name-matching approach (match against known style property names).

**Shared utility:** Create a `TastyContext` helper that rules can query:
- `isStyleObject(node)` — is this object literal a tasty style object?
- `isStateMap(node)` — is this object a state mapping (value of a style property)?
- `isSubElement(node)` — is this a sub-element style object?
- `isStaticCall(node)` — is this inside a `tastyStatic()` call?
- `isSelectorMode(node)` — is this a `tastyStatic(selector, styles)` call?
- `hasTypeInfo()` — is the TypeScript type checker available?

### Rule Complexity Summary

| Rule | Complexity | Priority |
|---|---|---|
| `known-property` | Low | P0 |
| `valid-value` | Medium | P0 |
| `no-nested-selector` | Low | P1 |
| `prefer-shorthand-property` | Low | P2 |
| `valid-color-token` | Medium | P0 |
| `valid-custom-unit` | Medium | P0 |
| `valid-custom-property` | Medium | P1 |
| `valid-preset` | Low | P1 |
| `valid-recipe` | Low | P1 |
| `valid-transition` | Low | P2 |
| `no-raw-color-values` | Medium | P3 |
| `valid-boolean-property` | Low | P1 |
| `valid-directional-modifier` | Medium | P1 |
| `valid-radius-shape` | Low | P1 |
| `valid-state-key` | Medium-High | P0 |
| `no-unknown-state-alias` | Low | P1 |
| `require-default-state` | Low | P2 |
| `valid-sub-element` | Low | P1 |
| `no-nested-state-map` | Medium | P1 |
| `valid-styles-structure` | Medium | P0 |
| `no-duplicate-state` | Low | P2 |
| `no-styles-prop` | Low | P3 |
| `no-important` | Low | P1 |
| `consistent-token-usage` | Medium | P3 |
| `no-runtime-styles-mutation` | High | P3 |
| `static-no-dynamic-values` | Medium | P1 |
| `static-valid-selector` | Low | P1 |
| `valid-state-definition` | Medium | P2 |

### Standalone Parsers

The plugin includes two standalone parsers in `src/parsers/` with zero dependency on `@tenphi/tasty`. These parsers are purpose-built for **deep validation** rather than CSS generation.

#### Value Parser (`src/parsers/value-parser.ts`)

Tokenizes and classifies style value strings into explicitly typed tokens. Unlike tasty's runtime parser (which silently classifies unknown tokens as "Mod" for performance), this parser reports every unrecognized token as an error.

The tokenizer follows tasty's `scan()` semantics:
- Commas separate **groups**
- Spaced slashes (`a / b`) separate **parts**
- Non-spaced slashes (`center/cover`) stay inside tokens
- Parenthesized content, quoted strings, and `url(...)` are kept as single tokens

Token classification:
1. `#name`, `#name.N`, `##name` → color tokens (syntax validated inline)
2. `$name`, `$$name` → custom property references
3. `functionName(...)` → CSS/custom function calls
4. `{number}{unit}` → custom or CSS units (checked against known sets)
5. Known CSS keywords → keywords
6. `!important` → flagged for rejection
7. Everything else → `unknown` token + error

**Excluded properties:** The value parser skips `recipe` (validated by `valid-recipe`) and structural keys like `@keyframes` and `@properties`.

#### State Key Parser (`src/parsers/state-key-parser.ts`)

Full recursive descent parser for state key notation. Returns validation errors instead of a CSS-generation AST.

Validates:
- Operator placement (`&`, `|`, `!`, `^`)
- Pseudo-class existence against known list
- `@media()` / `@()` dimension query syntax
- `@root()`, `@parent()`, `@own()` inner expressions (recursive)
- `@alias` references (tracked for config-based existence checks)
- XOR chain length warnings
- Nested `@own` prevention

Also exposes `validateStateDefinition()` for validating the right-hand side of state alias definitions.

**No runtime dependency:** The plugin has zero dependency on `@tenphi/tasty` at runtime. It only requires `eslint` as a peer dependency.

### Testing Strategy

Each rule should have tests covering:
1. Valid cases (should not report).
2. Invalid cases (should report with correct message and location).
3. Edge cases (dynamic values, spread operators, computed keys — should be skipped gracefully).
4. Config-dependent behavior (with and without relevant config fields).
5. Both `tasty()` and `tastyStatic()` contexts.
