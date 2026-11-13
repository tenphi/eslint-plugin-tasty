# eslint-plugin-tasty — Specification

ESLint plugin for validating `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, and related APIs from `@tenphi/tasty`.

---

## Table of Contents

- [Goals](#goals)
- [Detection Scope](#detection-scope)
- [Validation Config](#validation-config)
- [Rules](#rules)
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
| `mergeStyles({ ... }, { ... }, …)` | Every argument; the first is the base, later ones are partial overrides (state maps without `''` extend) |
| `helper({ ... }, { ... }, …)` | Same as `mergeStyles`, for a helper named in the linter's `settings.tasty.mergeFunctions` |

`settings.tasty.mergeFunctions` is a list of function names with `mergeStyles` semantics, for project helpers that wrap it. A call matches when its callee is an identifier bound to an import whose imported name is listed (from any module), to a default import, function or variable declared under a listed name, or to no declaration at all. A parameter of the same name shadows it; member calls are not matched. Anything but an array of strings is a configuration error. Every place that treats a `mergeStyles` call specially (style contexts, local state aliases, `no-runtime-styles-mutation`'s load-time values) treats a listed helper the same way.

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

1. **Heuristic (implemented, no type info)** — validate JSX attributes on uppercase component/member tags whose names match a known Tasty/CSS style property or `config.styles`. Native HTML/SVG tags and singular React `style` props are excluded, as are tags whose root binding (following `const` aliases) is imported from a bare specifier outside `importSources` and `ownedSources` — `<FocusScope contain />` from `react-aria`. An entry in either list covers the paths below it (`@my/ds` covers `@my/ds/button`). Components declared in the file, `tasty()` wrappers, and relative or in-repo imports stay checked. Matching non-style props on unrelated components can still need a rule suppression. With `settings.tasty.typeAwareJSX`, prop types decide, and the package check applies only to props the types leave unclassified.
2. **Type-aware (future enhancement)** — use the TypeScript type checker to see if the prop type originates from tasty's `Styles` interface. This also enables detecting arbitrary `Styles`-typed variables and expressions, not just call-site arguments.

Implemented value checks share discovery across static literals, templates,
TypeScript wrappers, state maps, conditional/logical branches, and nested
sub-elements in shared styles and JSX `styles`/`*Styles` props. Dynamic bindings,
calls, spreads, and interpolated templates are not evaluated. Token existence
checks keep the existing configured/file-local declaration rules. Quoted strings
and URLs are opaque to raw-color, token, and unit scanning. Function names such as
`$$double(...)` / `##tint(...)` are excluded from token existence checks while
their arguments are checked.

Automatic `var()`/`calc()` rewrites and semantic transition advice use a narrower
JSX gate: a local `const` factory result (`tasty` or a configured options factory)
or a component imported from a Tasty `importSources` module. Shadowed bindings
are excluded.

### Type-aware detection

When the user enables typed linting (via `parserOptions.project` in their ESLint config), the plugin gains access to `@typescript-eslint/utils`'s type services. This unlocks precise detection of tasty style objects in **any** position, not just known call sites:

| Pattern | Detection |
|---|---|
| `const s: Styles = { ... }` | Variable with `Styles` type annotation, whatever its name |
| `const m: Record<K, Styles> = { a: { ... } }` | Values of a map of styles (also `{ [k: string]: Styles }`); the map itself is not a style object |
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
   * - Package name: the `tasty.config.*` at the root of the package found in
   *   `node_modules`, or the config file a subpath names
   *   (`@my-org/ui/lint/tasty.config`, extension optional, or a directory).
   * The extended config is merged first, then this config's values override.
   * @example '../tasty.config.ts'
   * @example '@my-org/design-tokens'
   */
  extends?: string;

  /**
   * The `@tenphi/eslint-plugin-tasty` versions this config needs, as a semver
   * range. Every config in the `extends` chain may declare one; linting fails
   * when the installed plugin does not satisfy them all. Prereleases count, so
   * a snapshot of the next release satisfies a range of the current one.
   * @example '>=1.13.0'
   */
  requires?: string;

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

  /**
   * Import sources whose components this project can edit. Rules that would send
   * the author to a base component's own definition stay quiet over a base from
   * anywhere else. Same-file declarations and relative, absolute, `~`, `#` and
   * `@/` imports are owned without being listed; `*` matches any run of
   * characters.
   * @example ['@my-org/*']
   */
  ownedSources?: string[];

  /**
   * Design-system components consumers should customize through their props
   * instead of restyling, read by `tasty/no-protected-restyle`. Entries from an
   * extended config come first; `false` drops them.
   */
  protectedComponents?: false | ProtectedComponentConfig[];

  /** Read by the Tasty VS Code extension, which shares the file; ignored here. */
  presetDescriptions?: Record<string, string>;
  stateDescriptions?: Record<string, string>;
}

interface ProtectedComponentConfig {
  /** Package the components are imported from; `*` matches any run of characters. */
  source: string;
  /**
   * Exported names to protect. Defaults to every export. A name with a dot is a
   * member path (`Button.Split`, `Menu.*`).
   */
  include?: string[];
  /** Exported names or member paths to leave open, such as `*Icon` or `Button.Group`. */
  exclude?: string[];
  /**
   * Style props that place or size the root and stay allowed. `'position'` and
   * `'dimension'` stand for Tasty's `POSITION_STYLES` and `DIMENSION_STYLES`;
   * anything else is a property name. Defaults to none.
   */
  allowedStyleProps?: string[];
}
```

### Changes from `TastyExtensionConfig`

- Renamed to `TastyValidationConfig` (shared between ESLint plugin and future tooling).
- Added `recipes` field — validates `recipe` property values.
- Added `importSources` field — recognizes custom re-exports of tasty.
- Added `ownedSources` field — marks which base components are this project's to edit.
- Added `protectedComponents` field — lists the design-system components consumers should not restyle.
- Added `requires` field — the plugin versions a config needs.
- Kept `extends` for config composition.
- `presetDescriptions` and `stateDescriptions` are accepted but ignored — those are IDE tooltip features, not relevant for lint diagnostics.

### Config resolution

1. Look for `tasty.config.ts`, `tasty.config.js`, `tasty.config.mjs`, or `tasty.config.json` in the project root (nearest directory with `package.json`).
2. If `extends` is set, resolve and load the parent config first, then merge:
   - **Relative path** (starts with `.` or `/`): resolved relative to the current config file's directory.
   - **Package name** (anything else): the package is looked up in `node_modules` from the config's directory upward. A bare name uses the `tasty.config.*` at the package root; a subpath (`@my-org/ui/lint/tasty.config`) names a file inside the package, with or without its extension, or a directory holding a `tasty.config.*`.
3. `extends` chains are followed recursively (a parent config can also extend another).
4. Arrays are concatenated (deduped). `false` overrides parent arrays. Objects are shallow-merged.

### Config contract

Problems in a config file are reported rather than dropped:

- **`requires` not met** — the run fails with `tasty: <file> requires @tenphi/eslint-plugin-tasty <range>, but <version> is installed.` A `requires` that is not a valid semver range fails the same way.
- **Unknown keys** — a warning on stderr, once per config file, lists the keys the plugin does not read, such as a typo or a key from a newer plugin. They are ignored.
- **Known keys of the wrong shape** — a list key that is not a list of strings (or `false`, where that turns a check off), or a `styleFunctions` that is not an object, is a warning and ignored, rather than read character by character or as an empty list. When `tokens`, `states` or a similar key is an object keyed by name, the warnings say the file looks like Tasty's runtime config, which Tasty's SSR guide also names `tasty.config.ts`.
- **`extends` resolving to nothing** — a non-string value, a package that cannot be resolved, a package without a `tasty.config.*` at its root, or a package subpath that names no config is a warning, and the `extends` is ignored. So is a chain that leads back to a config already in it. A relative or absolute path that is not a file fails the run.
- **A config that is not an object** — a warning, and the file is ignored.

Warnings go to `console.warn` with an `[eslint-plugin-tasty]` prefix, since neither linter has a channel for problems that belong to no linted file. A failed load is cached against the mtimes of the files it read, like a successful one, so each rule on each file does not reload the chain to fail again.

### Config reloading

The config must be re-read when the user edits it. ESLint does not natively watch config files, so this depends on the environment:

- **CLI (`eslint .`)** — config is read once per run. No reloading needed; the user simply re-runs the command.
- **IDE integration (VS Code, Cursor, etc.)** — ESLint server typically re-lints on file save. The plugin should **not** cache the resolved config across lint runs. Instead, load and resolve the config on each `Program` node visit (once per file), and cache it in-memory only for the duration of that file's lint pass. This ensures edits to `tasty.config.ts` take effect on the next save/lint cycle without restarting the ESLint server.
- **Extended configs** — when `extends` is used, all referenced config files must be re-read, not just the root one.

**Implementation:** The config loader should use a file-mtime check: read the config file's `mtime`, and only re-parse if it changed since the last read. This avoids re-parsing on every file while still picking up edits promptly.

---

## Rules

Every rule has its own page in [`docs/rules/`](docs/rules/): what it checks, why, examples, options and the presets that enable it. The presets themselves are in [`src/configs.ts`](src/configs.ts). A new rule needs a page; `src/rule-docs.test.ts` checks that every rule has one and that this index links it.

### Properties

| Rule | Checks |
| --- | --- |
| [`tasty/known-property`](docs/rules/known-property.md) | Unknown style property names |
| [`tasty/no-nested-selector`](docs/rules/no-nested-selector.md) | `&`-prefixed nested selectors; use sub-elements |
| [`tasty/prefer-element-selector`](docs/rules/prefer-element-selector.md) | Element names instead of exact `data-element` attributes in `$` selectors |
| [`tasty/prefer-shorthand-property`](docs/rules/prefer-shorthand-property.md) | Tasty shorthands instead of native CSS longhands |
| [`tasty/prefer-longhand-property`](docs/rules/prefer-longhand-property.md) | Lossy `flex` shorthand instead of its longhands |
| [`tasty/prefer-hide`](docs/rules/prefer-hide.md) | `hide: true` instead of `display: 'none'` |

### Values

| Rule | Checks |
| --- | --- |
| [`tasty/valid-value`](docs/rules/valid-value.md) | Values the value parser cannot read |
| [`tasty/valid-color-token`](docs/rules/valid-color-token.md) | Color token syntax and existence |
| [`tasty/valid-custom-unit`](docs/rules/valid-custom-unit.md) | Unknown units |
| [`tasty/valid-custom-property`](docs/rules/valid-custom-property.md) | `$name` syntax and existence |
| [`tasty/valid-preset`](docs/rules/valid-preset.md) | Unknown preset names and modifiers |
| [`tasty/valid-recipe`](docs/rules/valid-recipe.md) | Unknown recipe names |
| [`tasty/valid-transition`](docs/rules/valid-transition.md) | Unknown and camelCase transition names |
| [`tasty/valid-boolean-property`](docs/rules/valid-boolean-property.md) | `true` on properties without a default |
| [`tasty/valid-directional-modifier`](docs/rules/valid-directional-modifier.md) | Directions a property does not take, and too many values per group |
| [`tasty/valid-radius-shape`](docs/rules/valid-radius-shape.md) | Unknown `radius` shapes |
| [`tasty/no-important`](docs/rules/no-important.md) | `!important` |
| [`tasty/no-raw-color-values`](docs/rules/no-raw-color-values.md) | Raw hex, color functions and named colors |
| [`tasty/no-raw-transition-duration`](docs/rules/no-raw-transition-duration.md) | Hardcoded `transition` durations |
| [`tasty/no-raw-motion-duration`](docs/rules/no-raw-motion-duration.md) | Hardcoded animation and duration values (opt-in) |
| [`tasty/consistent-token-usage`](docs/rules/consistent-token-usage.md) | Raw pixel lengths |
| [`tasty/prefer-auto-calc`](docs/rules/prefer-auto-calc.md) | `calc(...)` instead of auto-calc `(...)` |
| [`tasty/prefer-custom-property-syntax`](docs/rules/prefer-custom-property-syntax.md) | `var()`, `$x-color`, `transparent` and `currentColor` instead of tokens |
| [`tasty/prefer-fill-mix`](docs/rules/prefer-fill-mix.md) | Deprecated two-color fills |
| [`tasty/prefer-directional-shorthand`](docs/rules/prefer-directional-shorthand.md) | Four-value boxes that set one side |

### States

| Rule | Checks |
| --- | --- |
| [`tasty/valid-state-key`](docs/rules/valid-state-key.md) | State key syntax, the `_` floor and aliases |
| [`tasty/no-unknown-state-alias`](docs/rules/no-unknown-state-alias.md) | Unknown `@name` aliases |
| [`tasty/valid-state-definition`](docs/rules/valid-state-definition.md) | Invalid alias definitions in `configure({ states })` |
| [`tasty/require-default-state`](docs/rules/require-default-state.md) | State maps without `''` or `_` |
| [`tasty/valid-default-state-order`](docs/rules/valid-default-state-order.md) | Misplaced or redundant `''` and `_` |
| [`tasty/prefer-state-negation`](docs/rules/prefer-state-negation.md) | Top-level `:not()` instead of `!` |
| [`tasty/no-own-at-root`](docs/rules/no-own-at-root.md) | `@own()` in root styles |

### Structure

| Rule | Checks |
| --- | --- |
| [`tasty/valid-styles-structure`](docs/rules/valid-styles-structure.md) | The shape of a styles object and its at-rule keys |
| [`tasty/valid-sub-element`](docs/rules/valid-sub-element.md) | Sub-element values and root-targeting `$` selectors |
| [`tasty/no-nested-state-map`](docs/rules/no-nested-state-map.md) | State maps inside state maps |
| [`tasty/no-state-in-selector`](docs/rules/no-state-in-selector.md) | Conditions in sub-element `$` selectors |
| [`tasty/no-ignored-pseudo-element-state`](docs/rules/no-ignored-pseudo-element-state.md) | States Tasty ignores on a pseudo-element |

### Component props and composition

| Rule | Checks |
| --- | --- |
| [`tasty/no-style-prop`](docs/rules/no-style-prop.md) | React's `style` on Tasty components |
| [`tasty/no-classname-prop`](docs/rules/no-classname-prop.md) | `className` on Tasty components |
| [`tasty/no-styles-prop`](docs/rules/no-styles-prop.md) | Instance `styles` on Tasty components |
| [`tasty/no-protected-restyle`](docs/rules/no-protected-restyle.md) | Restyling a design system's protected components |
| [`tasty/no-runtime-styles-mutation`](docs/rules/no-runtime-styles-mutation.md) | Style values computed at render time |
| [`tasty/no-style-spread`](docs/rules/no-style-spread.md) | Spreads in style objects; `mergeStyles` for composition |

### tastyStatic

| Rule | Checks |
| --- | --- |
| [`tasty/static-no-dynamic-values`](docs/rules/static-no-dynamic-values.md) | Dynamic values in `tastyStatic()` |
| [`tasty/static-valid-selector`](docs/rules/static-valid-selector.md) | Invalid `tastyStatic()` selectors |

`tasty/no-duplicate-state` was specified here but never built: ESLint's core `no-dupe-keys` reports duplicate keys in a state map.

---

## Implementation Notes

### Project Setup

- **Package name:** `eslint-plugin-tasty`
- **ESLint version:** ESLint 9+ (flat config), with backward compatibility for ESLint 8 (legacy `.eslintrc`).
- **Language:** TypeScript
- **Test framework:** Vitest (consistent with tasty ecosystem)
- **Parser:** Use `@typescript-eslint/parser` for TypeScript/JSX support. The plugin itself should work with both JS and TS files.

### Presets

The plugin exports two presets, `recommended` and `strict`, from [`src/configs.ts`](src/configs.ts). `strict` is `recommended` plus `valid-custom-property`, `no-unknown-state-alias` and `valid-state-definition`. Each rule's page names the presets that enable it.

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
- Pseudo-class existence against `KNOWN_PSEUDO_CLASSES` (every standard pseudo-class in MDN's browser-compat-data, plus Selectors Level 4 ones it does not list yet)
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
