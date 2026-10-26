# @tenphi/eslint-plugin-tasty

## 1.12.1

### Patch Changes

- [#131](https://github.com/tenphi/eslint-plugin-tasty/pull/131) [`2579858`](https://github.com/tenphi/eslint-plugin-tasty/commit/2579858246e7f2c23fabbcc2d34f9b6672816ac3) Thanks [@tenphi](https://github.com/tenphi)! - At-rule descriptors no longer count as CSS properties. `known-css-properties` lists names such as `prefix`, `suffix`, `src`, `syntax`, `symbols`, `unicodeRange` and `orientation`, which a style rule cannot declare. The generated property list now leaves out every name that the W3C specs, through `@webref/css`, define only as a descriptor. Names that are also properties, such as `fontWeight` or `speakAs`, stay. `known-property` now reports these names as style keys. A JSX prop with one of these names, such as `<NumberInput prefix="$" />`, is no longer value-checked as a style.

- [#131](https://github.com/tenphi/eslint-plugin-tasty/pull/131) [`2579858`](https://github.com/tenphi/eslint-plugin-tasty/commit/2579858246e7f2c23fabbcc2d34f9b6672816ac3) Thanks [@tenphi](https://github.com/tenphi)! - `valid-value` accepts `display: '-webkit-box'` and `'-webkit-inline-box'`, which multi-line truncation with `-webkit-line-clamp` still needs. It also accepts an unspaced ratio such as `aspectRatio: '16/10'`, the same as `'16 / 10'`, since `<ratio>` allows optional whitespace around the slash. Other properties still report a ratio, such as `opacity: '1/2'`.

- [#131](https://github.com/tenphi/eslint-plugin-tasty/pull/131) [`2579858`](https://github.com/tenphi/eslint-plugin-tasty/commit/2579858246e7f2c23fabbcc2d34f9b6672816ac3) Thanks [@tenphi](https://github.com/tenphi)! - The style-value rules no longer check JSX props on components imported from other packages, such as `react-aria`'s `<FocusScope contain />`. Such a component's props are its own. This applies to a bare specifier that neither `importSources` nor `ownedSources` lists. An entry in either list covers the paths below it, so `@my/ds` covers `@my/ds/button`. `const` aliases resolve to the component they name. Components declared in the file, `tasty()` wrappers, and relative or in-repo imports are still checked. With `typeAwareJSX` on, prop types decide, and this rule applies only where they cannot, such as `any` or unresolved props. `ownedSources` entries now cover their subpaths for `prefer-shorthand-property` as well.

## 1.12.0

### Minor Changes

- [#126](https://github.com/tenphi/eslint-plugin-tasty/pull/126) [`c9f136a`](https://github.com/tenphi/eslint-plugin-tasty/commit/c9f136a7b915f41775886f39d7bd5bdf6361688e) Thanks [@tenphi](https://github.com/tenphi)! - `protectedComponents` entries can name a sub-component by its member path, such as `'Button.Group'` or `'Menu.*'`, in `include` or `exclude`. An entry that names a member path decides for it before an entry that matches only the export it hangs off. A separate component attached for convenience, such as a layout-primitive `Button.Group`, can then stay open while `Button` keeps its contract. The longest named path wins, so `'Button.Group'` also covers `Button.Group.Item`. Aliases, namespace imports, `const` aliases and relative re-exports of a member (`export const SplitButton = Button.Split`) resolve to the same path.

## 1.11.0

### Minor Changes

- [#123](https://github.com/tenphi/eslint-plugin-tasty/pull/123) [`2502009`](https://github.com/tenphi/eslint-plugin-tasty/commit/2502009da4a29bb1cfa6c06b32d0b6081d499a27) Thanks [@tenphi](https://github.com/tenphi)! - Add `tasty/no-protected-restyle` and the `protectedComponents` config key. A design system lists, in its `tasty.config.*`, the components consumers should customize through their props instead of restyling, and consumers inherit the list through `extends`. On those components the rule reports instance `styles` and `*Styles` props, appearance style props outside `allowedStyleProps`, and `tasty()` wrappers that restyle them. It follows aliases, namespace members, `tasty()` wrappers and relative re-exports. It is a warning in both presets and does nothing until a config lists protected components.

## 1.10.0

### Minor Changes

- [#120](https://github.com/tenphi/eslint-plugin-tasty/pull/120) [`236a719`](https://github.com/tenphi/eslint-plugin-tasty/commit/236a7199f5c72c477128e2cf165bcd023da4a821) Thanks [@tenphi](https://github.com/tenphi)! - `no-style-prop` gains an `elements` option: `'components'` reports `style` on every component and `'all'` on native elements too (default `'tasty'`, unchanged). With it, a project can remove `style` from `react/forbid-component-props` and `react/forbid-dom-props`, so a `style` exception names one rule and no longer hides the other props those rules forbid on the same line.

## 1.9.1

### Patch Changes

- [#118](https://github.com/tenphi/eslint-plugin-tasty/pull/118) [`aa0d701`](https://github.com/tenphi/eslint-plugin-tasty/commit/aa0d7011c89360eac6e318875f8131980c6d38b3) Thanks [@tenphi](https://github.com/tenphi)! - `valid-sub-element` accepts a `null` sub-element, such as the reset in `mergeStyles(base, { Title: null })`, like it accepts `false`. Its report now names the value readably ("not a string", "not an array") instead of "not a object".

## 1.9.0

### Minor Changes

- [#115](https://github.com/tenphi/eslint-plugin-tasty/pull/115) [`0accac8`](https://github.com/tenphi/eslint-plugin-tasty/commit/0accac8478ff1aaa8d3e35b02c759d974dd54472) Thanks [@tenphi](https://github.com/tenphi)! - Add a `mergeFunctions` linter setting (`settings.tasty.mergeFunctions`) that names project helpers wrapping `mergeStyles`, such as `mergeStyleLayers`. Their object arguments are now linted like `mergeStyles` arguments: the first is the base and later ones are partial overrides, including objects behind a conditional or held in a render-scope variable.

## 1.8.8

### Patch Changes

- [#112](https://github.com/tenphi/eslint-plugin-tasty/pull/112) [`e5cf408`](https://github.com/tenphi/eslint-plugin-tasty/commit/e5cf408d09020b625034a83933d5ebfc90e3bf4b) Thanks [@tenphi](https://github.com/tenphi)! - Style objects are recognized where they reach Tasty, not only where they are written in place. An object behind a conditional or logical operator (`mergeStyles(contentPadding != null ? { '$content-padding': contentPadding } : null, styles)`, `cond && { … }`, `styles ?? { … }`) takes the position of the whole expression. An object held in a render-scope variable counts when that variable is read as styles: `const local = { fontSize: size }` or `styles = { ...styles, fontSize: size }`, then `styles={local}`, `mergeStyles(styles, local)` or a sub-element `Icon: local`. `no-runtime-styles-mutation` now reports the render values in these objects, and every other rule checks them too, so a spread in a reassignment like the one above also gets `no-style-spread`'s warning. Module-scope bindings are unchanged.

## 1.8.7

### Patch Changes

- [#109](https://github.com/tenphi/eslint-plugin-tasty/pull/109) [`5200879`](https://github.com/tenphi/eslint-plugin-tasty/commit/5200879b192171aaaa3695d9c2815fb2e3e1df84) Thanks [@tenphi](https://github.com/tenphi)! - `no-runtime-styles-mutation` reports only values that can change between renders. Values fixed once the module has loaded generate their CSS once, like a literal, so they are no longer reported: `undefined`, module-scope `const` bindings, enums and imports and their members (`THEMES.special.color`), and templates, operators, conditionals and `mergeStyles(...)` calls built only from those (`` `${WIDTH}px` ``, `Icon: mergeStyles(BASE, { gridArea: 'icon' })`). Computed keys get the same test. Props, state, hook results, function parameters, local or `let` bindings and other calls are still reported, as in `mergeStyles(BASE, props.styles)` inside a component.

## 1.8.6

### Patch Changes

- [#106](https://github.com/tenphi/eslint-plugin-tasty/pull/106) [`5511ca7`](https://github.com/tenphi/eslint-plugin-tasty/commit/5511ca7d3a5edaa884ada015ad462dc563c1c3e1) Thanks [@tenphi](https://github.com/tenphi)! - `valid-value` accepts every CSS `display` keyword. Its list stopped at 13 values, so `grid-lanes` (CSS masonry), `flow-root`, `inline-table`, the rest of the table and ruby families, and the two-value syntax (`block flex`, `inline flow-root`, `list-item block`) were reported as invalid modifiers. The list now covers the outside, inside, list-item, internal, box and legacy keywords of CSS Display, plus `grid-lanes` / `inline-grid-lanes`. A misspelled keyword is still reported.

- [#106](https://github.com/tenphi/eslint-plugin-tasty/pull/106) [`5511ca7`](https://github.com/tenphi/eslint-plugin-tasty/commit/5511ca7d3a5edaa884ada015ad462dc563c1c3e1) Thanks [@tenphi](https://github.com/tenphi)! - `no-unknown-state-alias` and `valid-state-key` see local `@name` state aliases the way Tasty resolves them. A `mergeStyles(...)` call used as a sub-element value (`Icon: mergeStyles(BASE, { … })`) was checked without the aliases of the styles around it, so an alias defined on the root was reported as unknown. Its arguments now see the enclosing styles' aliases, aliases from every object argument of the same `mergeStyles` call count, and a sub-element also sees aliases defined on the sub-elements that contain it, as Tasty's renderer does.

## 1.8.5

### Patch Changes

- [#102](https://github.com/tenphi/eslint-plugin-tasty/pull/102) [`7c74bf0`](https://github.com/tenphi/eslint-plugin-tasty/commit/7c74bf0ee382a0c9901f141ae6ba147722178dc1) Thanks [@tenphi](https://github.com/tenphi)! - Object arguments of `mergeStyles(...)` imported from a Tasty import source are linted as style objects. `no-style-spread` recommends `mergeStyles` for composition, but following that advice took the overrides out of every rule: unknown tokens, misspelled properties and spreads inside the arguments all passed. The first argument is checked as a base style object; each later one as a partial override, so a state map without `''` there extends the one below it and `require-default-state` stays quiet, as `mergeStyles` merges it. A `styleFunctions.mergeStyles` entry in a tasty config is now superseded by this built-in signature.

## 1.8.4

### Patch Changes

- [#100](https://github.com/tenphi/eslint-plugin-tasty/pull/100) [`7eadd0d`](https://github.com/tenphi/eslint-plugin-tasty/commit/7eadd0d68bdde11ee38e1939f111c679dfab4720) Thanks [@tenphi](https://github.com/tenphi)! - `valid-transition` no longer splits a transition on commas inside a timing function. `'visibility .5s steps(2, start)'` reported `start)` as an unknown transition name, and `cubic-bezier(0.5, 0.05, 0.3, 0.95)` reported each argument after the first. Commas inside parentheses or quotes now stay in their transition, and the suggestions for later transitions in the list point at the right text.

## 1.8.3

### Patch Changes

- [#96](https://github.com/tenphi/eslint-plugin-tasty/pull/96) [`cf03b38`](https://github.com/tenphi/eslint-plugin-tasty/commit/cf03b38f48aa5e120e102524b3c3d9162c622032) Thanks [@tenphi](https://github.com/tenphi)! - `require-default-state` skips a state map that spreads another one (`fill: { ...(BASE_STYLES.fill as Record<string, string>), 'selected & disabled': '#surface-3' }`), since the spread may carry the `''` default.

- [#96](https://github.com/tenphi/eslint-plugin-tasty/pull/96) [`cf03b38`](https://github.com/tenphi/eslint-plugin-tasty/commit/cf03b38f48aa5e120e102524b3c3d9162c622032) Thanks [@tenphi](https://github.com/tenphi)! - `no-own-at-root`'s autofix unwraps each `@own(…)` term of a key on its own. Keys with several terms were corrupted: `'@own(pin-edge) & @own(pin=start)'` became `'pin-edge) & @own(pin=start'`. They now become `'pin-edge & pin=start'`. A term with operators inside stays grouped (`@own(hovered | focused) & active` → `(hovered | focused) & active`). A key whose `@own()` holds a comma is reported without a fix. The rule also no longer reports shared style objects declared on their own (`const CELL_STYLES: Styles`, a value of a `Record<K, Styles>`): they may be spread into a sub-element, where `@own()` is meaningful, and unwrapping it there silently changed which element the state matched.

## 1.8.2

### Patch Changes

- [#92](https://github.com/tenphi/eslint-plugin-tasty/pull/92) [`7328196`](https://github.com/tenphi/eslint-plugin-tasty/commit/7328196c4701161e6dd2e8c79892700503d1c12b) Thanks [@tenphi](https://github.com/tenphi)! - `no-style-prop`, `no-classname-prop`, `no-styles-prop` and the Tasty-component gate for JSX value rewrites recognize Tasty components imported from relative modules (`import { Panel } from './styled'`). The imported module is read the same syntactic way as the current file: a `tasty()` or configured options-factory result, a `const` alias of one, an import from `importSources`, a default export, or a re-export (`export { … } from`, `export * from`) that leads to one. Specifiers resolve with or without an extension, including `./styled.js` for `styled.ts` and directory `index` files. Reading the module needs the `typescript` package. Without it, imported components are not recognized, as before. Namespace imports (`<UI.Panel />`) and path aliases are not followed.

- [#92](https://github.com/tenphi/eslint-plugin-tasty/pull/92) [`7328196`](https://github.com/tenphi/eslint-plugin-tasty/commit/7328196c4701161e6dd2e8c79892700503d1c12b) Thanks [@tenphi](https://github.com/tenphi)! - A `Styles` type annotation is read before the variable's name, so `export const CARD_STYLES: Styles = { … }` is now linted like `cardStyles: Styles`. Before, every SCREAMING_CASE constant was skipped, and the `$name` keys it declared were missing from `valid-custom-property`'s file set. An unannotated constant is still not matched on its name. A map of styles (`Record<K, Styles>`, `{ [key: string]: Styles }`, `{ root: Styles }`) is no longer checked as a style object itself: its values are, so variant names are not reported as unknown properties. `valid-sub-element` no longer reports a sub-element whose value is a binding (`Prefix: ADD_STYLES`): a `const` is followed to its value, and any other binding, member or call is accepted as a possible style object.

- [#92](https://github.com/tenphi/eslint-plugin-tasty/pull/92) [`7328196`](https://github.com/tenphi/eslint-plugin-tasty/commit/7328196c4701161e6dd2e8c79892700503d1c12b) Thanks [@tenphi](https://github.com/tenphi)! - `valid-custom-property` accepts custom properties declared through `tokens` in the same file: `$name` keys of a literal `tokens={{ … }}` JSX prop or of the `tokens` option of `tasty()` (or a configured options factory), and `'--name'` keys of a literal inline `style={{ … }}`, which set the same property. Following `no-style-prop`'s advice to move `'--progress'` into `tokens={{ $progress: … }}` no longer leads to an unknown-property warning. The message now says to declare the property "in a styles object or 'tokens' prop in this file", since the check covers the whole file.

## 1.8.1

### Patch Changes

- [#87](https://github.com/tenphi/eslint-plugin-tasty/pull/87) [`b71d2ae`](https://github.com/tenphi/eslint-plugin-tasty/commit/b71d2aef2e3a3c58489969a456efeeeba28ca9a7) Thanks [@tenphi](https://github.com/tenphi)! - `valid-value` accepts CSS system colors (`Canvas`, `CanvasText`, `Highlight`, `ButtonText`, `GrayText`, `LinkText`, …) and named colors wherever a color is. `border: '1bw Highlight'`, `outline: '1ow Highlight'`, `fill: 'Canvas'` and `color: 'CanvasText'` were reported as invalid modifiers, so a forced-colors style could not be written without disabling the rule. The rule now recognizes the same keywords as Tasty 3.12, case-insensitively: the 148 named colors and the 19 current system colors. The deprecated system colors (`Menu`, `Window`, `ButtonHighlight`, …) are still reported, and a color keyword in a property that takes no color (`padding: '2x Highlight'`) is reported as an unexpected color. `no-raw-color-values` still suggests a token for a named color such as `red`, and does not flag system colors.

## 1.8.0

### Minor Changes

- [#85](https://github.com/tenphi/eslint-plugin-tasty/pull/85) [`45e4bc3`](https://github.com/tenphi/eslint-plugin-tasty/commit/45e4bc34963c298e260b6aca63a242379b1c8538) Thanks [@tenphi](https://github.com/tenphi)! - Add `tasty/no-ignored-pseudo-element-state`, enabled as an error in the recommended and strict presets, like `valid-state-key`'s check for a misused `_` fallback key, which Tasty also ignores with a runtime warning. When a sub-element's `$` ends in a pseudo-element, Tasty applies `@own(...)` to the pseudo-element itself and ignores states a pseudo-element cannot have, with a `PSEUDO_ELEMENT_STATE_IGNORED` warning at runtime. The rule reports those states while you edit: modifiers (`@own(hovered)`), attributes (`@own([open])`), classes and IDs, tree-structural pseudo-classes (`@own(:last-child)`, `:nth-*()`, `:has()`), and keys that combine one of them with other states. It also covers `&` keys and the root states of `useGlobalStyles()` / `tastyStatic()` selectors that end in a pseudo-element. Write a condition on the element the pseudo-element belongs to in the selector instead: `$: 'a[rel="next"]::before'`.

### Patch Changes

- [#84](https://github.com/tenphi/eslint-plugin-tasty/pull/84) [`7737419`](https://github.com/tenphi/eslint-plugin-tasty/commit/7737419ef9496d467003e80f020663894f0d1b46) Thanks [@tenphi](https://github.com/tenphi)! - `tasty/no-state-in-selector` no longer reports conditions on the element a pseudo-element belongs to, such as `a[rel="next"]::before`, `dialog[open]::backdrop`, `li:last-child::marker`, or the legacy `a[rel]:before`. Tasty now applies `@own(...)` on such a sub-element to the pseudo-element itself and drops the states a pseudo-element cannot have, so these conditions must stay in `$`. Conditions inside the pseudo-element (`::slotted(img:hover)`) are accepted for the same reason. Pseudo-classes after the pseudo-element (`@::part(label):hover`) are still reported, because `@own(:hover)` now expresses them exactly. Each item of a selector list is checked on its own.

- [#82](https://github.com/tenphi/eslint-plugin-tasty/pull/82) [`c2ebb63`](https://github.com/tenphi/eslint-plugin-tasty/commit/c2ebb63f60b87a3d5d36c71164592dcf87f313af) Thanks [@tenphi](https://github.com/tenphi)! - `valid-state-key` accepts every standard CSS pseudo-class, including functional ones. Keys such as `:dir(rtl)`, `:lang(en)`, `:popover-open`, `:open`, `:modal`, `:user-invalid`, `:state(checked)` and `@own(:popover-open)` were reported as unknown, even though Tasty compiles them correctly. The known list now covers every standard pseudo-class in MDN's browser-compat-data, plus the Selectors Level 4 ones it does not list yet. Misspelled pseudo-classes are still reported.

## 1.7.3

### Patch Changes

- [#78](https://github.com/tenphi/eslint-plugin-tasty/pull/78) [`cf5cb8e`](https://github.com/tenphi/eslint-plugin-tasty/commit/cf5cb8e63231fa738b39eda7e910a81b7bbf9780) Thanks [@tenphi](https://github.com/tenphi)! - Accept TypeScript 6 in the optional `typescript` peer range (`>=5.6.3 <7`), so projects on TypeScript 6 no longer get an unmet peer warning. The experimental `settings.tasty.typeAwareJSX` analysis works unchanged on TypeScript 6, including with tsconfigs that still use options TypeScript 6 deprecates, such as `baseUrl` or `moduleResolution: "node"`. TypeScript 7 is not supported yet: its package no longer exposes the compiler API that `typeAwareJSX` uses.

- [#79](https://github.com/tenphi/eslint-plugin-tasty/pull/79) [`93011d6`](https://github.com/tenphi/eslint-plugin-tasty/commit/93011d60ae4805515a4878932d2a5c160b1406f1) Thanks [@tenphi](https://github.com/tenphi)! - With TypeScript 7 installed, the experimental `settings.tasty.typeAwareJSX` analysis now fails with a clear error that names the installed version and asks for TypeScript 5.6–6.x. Previously it crashed with `TypeError: T.findConfigFile is not a function`. TypeScript 7's package no longer exposes the JavaScript compiler API that `typeAwareJSX` uses.

## 1.7.2

### Patch Changes

- [#74](https://github.com/tenphi/eslint-plugin-tasty/pull/74) [`ea0653a`](https://github.com/tenphi/eslint-plugin-tasty/commit/ea0653a74d65c5cb0f8a1b16e321306a29c07a4d) Thanks [@tenphi](https://github.com/tenphi)! - `valid-custom-property` no longer reports Tasty's built-in custom properties as unknown when the config lists `tokens`: `$gap`, `$radius`, `$border-width`, `$outline-width`, `$transition`, `$sharp-radius`, `$bold-font-weight`, `$font-sans-fallback` and `$font-mono-fallback`, including the `$$name` form. Before, they were accepted only when the plugin could load the `tasty.config.ts` that `@tenphi/tasty` ships, and that file lacks the two font fallbacks.

- [#76](https://github.com/tenphi/eslint-plugin-tasty/pull/76) [`51f5ed3`](https://github.com/tenphi/eslint-plugin-tasty/commit/51f5ed3a5de4a9e49c8c8fe5fade56943290142c) Thanks [@tenphi](https://github.com/tenphi)! - `valid-transition` reports a camelCase CSS name such as `gridTemplateColumns` or `maskSize`, with a suggestion for the kebab-case name. Tasty lowercases the name and emits it verbatim, so it compiles to no property at all (`gridtemplatecolumns`). Names with a semantic equivalent (`boxShadow`) keep the semantic suggestion, and `zIndex` is still accepted.

- [#73](https://github.com/tenphi/eslint-plugin-tasty/pull/73) [`4362959`](https://github.com/tenphi/eslint-plugin-tasty/commit/43629590a6edcec9bf7162a2c8f142ac767586e8) Thanks [@tenphi](https://github.com/tenphi)! - Align four rules with what `@tenphi/tasty` does.
  - `valid-color-token` no longer reports Tasty's built-in color tokens as unknown when the config lists `tokens`: `#current`, `#clear`, `#white`, `#black`, `#border` and `#outline`, with or without an opacity suffix. This includes the `#clear` that `prefer-custom-property-syntax` writes for `transparent`.
  - `valid-transition` reports `flow` and `dimension`, which are not Tasty transition names (Tasty emits them verbatim as invalid CSS). It no longer suggests `flow` for `flex-direction` / `grid-auto-flow`, or `gridColumns` / `gridRows` for `grid-template-columns` / `grid-template-rows`.
  - `valid-preset` accepts the `normal` modifier (`line-height: normal`), both after a slash (`h1 / normal`) and as the modifier-only shorthand (`preset: 'normal'`).
  - Color token opacity suffixes are read as a decimal fraction, as Tasty reads them, so any digit string is valid: `#purple.150` (15%) and `#purple.999` (99.9%) no longer report "exceeds 100". A suffix that is not a digit string, such as `#purple.5.5`, is now reported.

## 1.7.1

### Patch Changes

- [#71](https://github.com/tenphi/eslint-plugin-tasty/pull/71) [`721d5c2`](https://github.com/tenphi/eslint-plugin-tasty/commit/721d5c2c61ef336d08e9d60c67ba602d24167f8f) Thanks [@tenphi](https://github.com/tenphi)! - Fix `no-unknown-state-alias` treating a whole state key that starts with an alias as one alias name. Compound keys like `'@selected | indeterminate'` are now parsed, and each `@name` alias is checked on its own wherever it appears in the key, including after operators, inside groups, and inside `@root()`/`@parent()`/`@own()`.

## 1.7.0

### Minor Changes

- [#69](https://github.com/tenphi/eslint-plugin-tasty/pull/69) [`4da790d`](https://github.com/tenphi/eslint-plugin-tasty/commit/4da790d5641220a8306255ef78911e278c8c09da) Thanks [@tenphi](https://github.com/tenphi)! - Add experimental, opt-in `settings.tasty.typeAwareJSX` to distinguish declared
  component props from Tasty style props in both ESLint and Oxlint. Resolve JSX prop
  declarations with a lazily loaded, cached TypeScript program while preserving
  existing value checks for style declarations and unresolved types.

  Reuse unchanged parsed sources when lint buffers change, refresh reused ESLint
  source objects after dependency/config edits, and keep primitive-union style
  checks. TypeScript is optional; presets and existing consumers remain opt-in.

## 1.6.0

### Minor Changes

- [#67](https://github.com/tenphi/eslint-plugin-tasty/pull/67) [`e18e618`](https://github.com/tenphi/eslint-plugin-tasty/commit/e18e618572e9acc0d2d2152d71b8a63f9c050be9) Thanks [@tenphi](https://github.com/tenphi)! - Warn about `style`, `className`, and `styles` props on recognized Tasty components
  in both presets. New `no-style-prop` and `no-classname-prop` rules recommend tokens
  and sub-element `data-element` identities; `no-styles-prop` now also checks dynamic
  values and recommends tokens, mods, exposed props/variants, or a styled wrapper.
  All three cover explicit props and inline object spreads, with import-aware,
  shadow-aware detection and report-only migration guidance.

  Clarify intentional exceptions in prop and related advisory warnings, including
  third-party styling integration and edge-case instance overrides. Recommend
  explicit local ESLint ignores with reasons and document their scope.

### Patch Changes

- [#67](https://github.com/tenphi/eslint-plugin-tasty/pull/67) [`e18e618`](https://github.com/tenphi/eslint-plugin-tasty/commit/e18e618572e9acc0d2d2152d71b8a63f9c050be9) Thanks [@tenphi](https://github.com/tenphi)! - Apply style-value checks to consumer JSX props, state maps, visible expression
  branches, and nested shared/JSX styles. Report arbitrary nonzero pixel lengths
  (including numeric inputs to enhanced length handlers), retaining suggestions for
  known unit equivalents. Fix token/function detection and unit checks inside
  expressions, and protect quoted CSS text, URLs, escaped strings, and JSX entities
  from false reports or unsafe rewrites.

## 1.5.2

### Patch Changes

- [#65](https://github.com/tenphi/eslint-plugin-tasty/pull/65) [`1073163`](https://github.com/tenphi/eslint-plugin-tasty/commit/107316338e804ab3d561aa4d2ff122b5c65ffb44) Thanks [@tenphi](https://github.com/tenphi)! - Explain independent token overrides in shorthand-property warnings, with concrete min/max dimension examples that preserve otherwise unconstrained dimensions. Tailor guidance to component, sub-element, hook, and static contexts, including the limits of static preset and scrollbar syntax. Keep behavior-changing rewrites report-only.

## 1.5.1

### Patch Changes

- [#63](https://github.com/tenphi/eslint-plugin-tasty/pull/63) [`85b7ba3`](https://github.com/tenphi/eslint-plugin-tasty/commit/85b7ba3c2f43a97d966afb53eb608482d5c2239f) Thanks [@tenphi](https://github.com/tenphi)! - Improve `no-style-spread` to recommend `mergeStyles` when multiple spreads compose a style object, with one warning explaining the risk of losing sub-element properties and state-map entries.

## 1.5.0

### Minor Changes

- [#62](https://github.com/tenphi/eslint-plugin-tasty/pull/62) [`aacb8e7`](https://github.com/tenphi/eslint-plugin-tasty/commit/aacb8e730f302974973216ccd71b05b8e1fe320c) Thanks [@tenphi](https://github.com/tenphi)! - Add the recommended `prefer-element-selector` warning with safe autofixes from explicit `data-element` attributes to Tasty element names in sub-element selectors.

### Patch Changes

- [#60](https://github.com/tenphi/eslint-plugin-tasty/pull/60) [`7bfd8d1`](https://github.com/tenphi/eslint-plugin-tasty/commit/7bfd8d10ce78188f1ac272bb09e44757f098b7b0) Thanks [@tenphi](https://github.com/tenphi)! - Report sub-element `$` selectors such as `&:is(h1)` that style the containing element as `valid-sub-element` errors. Root pseudo-elements remain valid; use property state maps in the containing scope or descendant selectors for heading presets.

## 1.4.0

### Minor Changes

- [#58](https://github.com/tenphi/eslint-plugin-tasty/pull/58) [`5dd5999`](https://github.com/tenphi/eslint-plugin-tasty/commit/5dd59990b1cab021d8ab26c13a586b426993877b) Thanks [@tenphi](https://github.com/tenphi)! - Add the `no-state-in-selector` warning to recommended and strict presets. It
  reports pseudo-class and attribute conditions in sub-element `$` selectors so
  authors can move those conditions into property state maps. Structural grouping,
  pseudo-elements, and exact `data-element` identities remain supported. The rule
  is report-only to avoid changing selector scope or defaults automatically.

## 1.3.0

### Minor Changes

- [#55](https://github.com/tenphi/eslint-plugin-tasty/pull/55) [`9ed0efd`](https://github.com/tenphi/eslint-plugin-tasty/commit/9ed0efdb7d5fec71b6f41254062a10d4ae35b2ef) Thanks [@tenphi](https://github.com/tenphi)! - Warn by default when runtime Tasty styles use JavaScript-computed values or
  spreads. Keep spread warnings separately suppressible and preserve build-time
  errors for `tastyStatic()`.

- [#57](https://github.com/tenphi/eslint-plugin-tasty/pull/57) [`96105cc`](https://github.com/tenphi/eslint-plugin-tasty/commit/96105ccaa41e22980dacaec3fc536dde58139bc5) Thanks [@tenphi](https://github.com/tenphi)! - Add `prefer-state-negation`, enabled as a warning in the recommended and strict presets. Autofix top-level `:not(...)` state keys to the `!` prefix while preserving nested selectors and wrapping selector lists or compounds in `!:is(...)`.

## 1.2.0

### Minor Changes

- [#53](https://github.com/tenphi/eslint-plugin-tasty/pull/53) [`54c2968`](https://github.com/tenphi/eslint-plugin-tasty/commit/54c29681edcea76f457ff39a5551922824a8c634) Thanks [@tenphi](https://github.com/tenphi)! - Improve transition duration warnings for styled component props and raw time
  expressions, while allowing intentional zero durations. Add an opt-in warning
  for raw animation and explicit CSS durations.

## 1.1.0

### Minor Changes

- [#52](https://github.com/tenphi/eslint-plugin-tasty/pull/52) [`dd0c98c`](https://github.com/tenphi/eslint-plugin-tasty/commit/dd0c98cb293317b03aabc3d651782d8df706bdc4) Thanks [@tenphi](https://github.com/tenphi)! - Add `styleFunctions` configuration to validate custom imported helpers that accept
  Tasty style objects or component options. Support configurable argument positions,
  variadic style merging, variants, sub-elements, and `partial: true` for overrides
  that rely on existing styles.
  Track import aliases and ignore shadowed or type-only imports. Verify diagnostics
  and safe fixes with both ESLint and oxlint, including the full recommended and
  strict presets. Keep local aliases within variant style roots, accept TypeScript
  wrappers on sub-elements, and skip uncertain argument positions after spreads.

- [#50](https://github.com/tenphi/eslint-plugin-tasty/pull/50) [`e83d45a`](https://github.com/tenphi/eslint-plugin-tasty/commit/e83d45a3b7b664c92e8376155e574a6e9022058a) Thanks [@tenphi](https://github.com/tenphi)! - Report `fill: true`, and check `true` inside state maps.

  `fill` is documented as accepting `true`, but as of tasty 3.8 the handler passes the
  boolean straight through: `fill: true` emits `background-color: true`, which the browser
  drops, leaving the element with no background at all. That is invisible at runtime and
  indistinguishable from a typo at lint time, so `valid-boolean-property` now reports it.
  `fill: false` stays valid — it is a tombstone, like `false` on any property.

  Two round-trip guards keep this honest against the runtime rather than the docs: no
  property in `BOOLEAN_TRUE_PROPERTIES` may render the literal `true`, and `fill` still
  does — so whichever way tasty resolves the discrepancy, a test says so instead of the
  plugin quietly disagreeing. `fill` was the only entry in the list affected.

  `valid-boolean-property` also descends into state maps now, which it never did. A state
  map holds values for the same property, so `true` is exactly as unsupported in one as it
  is written directly — and `fill: { '': '#clear', hovered: true }` is the shape that reads
  as if it should work. Every other value-checking rule in the plugin already descended;
  this one was the exception.

- [#50](https://github.com/tenphi/eslint-plugin-tasty/pull/50) [`e83d45a`](https://github.com/tenphi/eslint-plugin-tasty/commit/e83d45a3b7b664c92e8376155e574a6e9022058a) Thanks [@tenphi](https://github.com/tenphi)! - Validate tasty 3.8's enhanced logical styles.

  Tasty 3.8 gave each logical axis/category pair its own handler — `blockPadding`,
  `inlineBorder`, `blockSize` and the rest — which emits native logical CSS instead of
  converting the value to a physical edge. All eighteen names are now recognised style
  properties, and each rule that reads a property vocabulary knows theirs:
  - `known-property` accepts them; `valid-boolean-property` accepts `true` on each
    (its category's design-system default), and now also on `scrollMargin` and
    `scrollPadding`.
  - `valid-directional-modifier` gives them `start`/`end`, and reports a mix in either
    direction: a physical side on a logical axis (`blockPadding: '1x top'`) and a logical
    edge on a physical property (`padding: '1x start'`) are both silently dropped by the
    runtime. `scrollPadding` gained a directional handler in 3.8 and now answers to the
    same one-value-per-group rule as `scrollMargin`.
  - `prefer-shorthand-property` points the native CSS spellings at the enhanced style
    (`paddingBlock` → `blockPadding`, `minBlockSize` → `blockSize: 'min ...'`), mirroring
    the physical rows. The axis renames are auto-fixed; edge longhands and `border-*`
    renames stay report-only because they change what the browser renders.
  - `no-raw-color-values` covers `blockBorder`/`inlineBorder` and the logical CSS border
    colours.

  **The `@tenphi/tasty` peer floor moves from `>=3` to `>=3.8.0`.** The plugin never imports
  tasty, so its constants are baked at publish time and cannot adapt to the consumer's
  version — and on 3.7 and below `blockPadding` is not a style tasty knows. An unhandled
  camelCase key renders straight through to `block-padding`, which the browser drops, so the
  auto-fix below would silently delete the padding. Recognising the logical names is harmless
  on an older tasty (a missed warning); rewriting _to_ them is not.

  **Migrating off the native spellings.** `paddingBlock`, `paddingInline`, `insetBlock`,
  `insetInline`, `marginBlock`, `marginInline`, `scrollMarginBlock`, `scrollPaddingInline`
  and the rest are no longer _tasty_ properties: 3.8 stopped reading them in its physical
  handlers, so they carry no category default. They stay valid keys as ordinary CSS, so
  nothing breaks — but each is reported with an **auto-fix** onto the enhanced style, so
  `eslint --fix` migrates a codebase in one pass:

  ```diff
  - paddingBlock: '1x 2x'
  + blockPadding: '1x 2x'
  - insetInline: '0'
  + inlineInset: '0'
  ```

  The axis renames are pure key edits — both keys emit the same declaration — and
  `constants.round-trip.test.ts` now asserts that against the installed runtime for every
  `safeFix` rename, so a handler that starts adding a default fails a test instead of
  shipping an autofix that changes rendering.

  Three groups are reported **without** a fix, because the rewrite is not equivalent:
  - Edge longhands (`paddingBlockStart` → `blockPadding: '... start'`). The axis handler
    resets the edge you do not name, so the rewrite zeroes the opposite edge — the same
    reason `paddingTop` → `padding: '... top'` has never been auto-fixed.
  - `borderBlock` and friends → `blockBorder`, which fills in the style and colour
    defaults `border-block` never had (`border-block: 1bw` renders nothing at all).
  - `minBlockSize` → `blockSize: 'min ...'`, which also emits `block-size` and
    `max-block-size`, mirroring `minWidth`.

  `consistent-token-usage` also treats a `1px` in `blockBorder`/`inlineBorder` as the
  `1bw` token spelled out, as it already did for physical `border` — the logical axes take
  the same width/style/colour value through the same parser, so the advice should not
  depend on which vocabulary the author used.

  `place` is recognised as well. It is a real Tasty style (`place: 'center start'` emits
  four alignment declarations) with no CSS property of the same name to fall back on, so
  `known-property` had been reporting valid code. Found by checking the constants against
  tasty's exported style lists, which is now a test: every style in them must be a
  property the plugin recognises.

- [#50](https://github.com/tenphi/eslint-plugin-tasty/pull/50) [`e83d45a`](https://github.com/tenphi/eslint-plugin-tasty/commit/e83d45a3b7b664c92e8376155e574a6e9022058a) Thanks [@tenphi](https://github.com/tenphi)! - Add `tasty/no-raw-transition-duration` (recommended, warn).

  Reports a hardcoded duration in a `transition` value — `transition: 'fill 0.2s'` — and
  suggests either a duration token from your `tasty.config` (`$transition`,
  `$fast-transition`, anything named `*-transition` or containing `duration`) or dropping
  the duration so tasty substitutes `var(--<name>-transition, var(--transition))`. Motion
  timing a design system owns belongs in one place; a `0.2s` spread through components is
  the same drift as a raw hex colour.

  Only the duration slot is checked. A later time value is a _delay_
  (`transition: 'fill ease-in 0.1s'`) and is left alone, because omitting a delay means
  "no delay" rather than "inherit the default". Already-tokenised and derived forms —
  `$transition`, `var(--transition)`, `(0.2s * 2)` — are not reported. Both suggestions
  change what the browser renders, so neither is applied by `eslint --fix`.

### Patch Changes

- [#50](https://github.com/tenphi/eslint-plugin-tasty/pull/50) [`e83d45a`](https://github.com/tenphi/eslint-plugin-tasty/commit/e83d45a3b7b664c92e8376155e574a6e9022058a) Thanks [@tenphi](https://github.com/tenphi)! - Stop suppressing correct `$name` rewrites in `prefer-custom-property-syntax`.

  The rule held back a `var(--x)` → `$x` rewrite for two dozen properties whose handlers
  used to pass the value through verbatim, which would have emitted an invalid
  `font-family: $font-sans`. Tasty **3.0.2** taught those handlers to substitute `$name`
  refs (tasty#264), so the suppression list has been stale for eight releases — the
  plugin's own round-trip guard, which re-derives it from the installed runtime, caught
  this on the bump to 3.8.0. `fontFamily`, `fill`, `color` and the rest now get the
  rewrite.

  This needs tasty >= 3.0.2, which the peer floor now covers — see the logical-styles
  changeset, which raises it to `>=3.8.0` for a stronger reason.

## 1.0.5

### Patch Changes

- [#48](https://github.com/tenphi/eslint-plugin-tasty/pull/48) [`567b8ca`](https://github.com/tenphi/eslint-plugin-tasty/commit/567b8ca25d4293493cc029a7fafeae29c6f624eb) Thanks [@tenphi](https://github.com/tenphi)! - ## `prefer-shorthand-property` stops rewriting keys inside an extension layer

  The rename this rule offers is safe in a base definition and unsafe in an extension layer,
  because layers merge per key. `paddingTop: '2x'` → `padding: '2x top'` looked like a
  narrowing rewrite but dropped the base component's other three edges to `0`, and even the
  carry-over pair (`backgroundColor` → `fill`, `borderRadius` → `radius`) replaced a state map
  the layer never mentioned.

  Inside `tasty(Base, {...})` / `tastyStatic(Base, {...})` — sub-element objects included — the
  report now carries no fix and names the shape that actually belongs there: a token in the base
  component's property, set from the layer.

  ```js
  const Card = tasty({ styles: { padding: '$v-padding $h-padding' } });
  const TallCard = tasty(Card, { styles: { '$v-padding': '4x' } });
  ```

  ### A `styles` prop is an extension layer too

  `<Card styles={{ … }} />` and a Storybook `args.styles` land on top of a component that
  already has its own styles, which is the same situation as `tasty(Base, {…})` — but the style
  context reported `isExtending: false` for them. They now extend, so this rule withholds its
  rewrite there as well, and `require-default-state` stops asking a `styles` prop for a `''`
  default the base already provides.

  ### The suggestion is skipped over a base you cannot edit

  Adding a token seam means editing the base component's own definition, so the report is
  skipped when the base is imported from a package: over a UI-kit component the author's only
  remaining options are the longhand they already wrote or a rewrite that would clobber the
  base, and recommending neither is noise. Same-file declarations and relative, absolute, `~`,
  `#` and `@/` imports count as yours; a base that cannot be resolved to an import is treated as
  yours too, so silence needs positive evidence. A type assertion does not hide where a base
  came from — `tasty(Button as any, …)` resolves to `Button` and is classified on its real
  import. A design system published from your own monorepo is opted back in with the new
  `ownedSources` config key:

  ```ts
  // tasty.config.ts
  export default { ownedSources: ['@my-org/*'] };
  ```

  `ownedSources` is optional on the exported `ResolvedConfig` type, so an object literal written
  against 1.0 still compiles; `loadConfig` always fills it in.

  Base definitions, selector-mode `tastyStatic('.card', {...})`, and `variants` are unchanged
  and still auto-fix.

## 1.0.4

### Patch Changes

- [#46](https://github.com/tenphi/eslint-plugin-tasty/pull/46) [`84e31fe`](https://github.com/tenphi/eslint-plugin-tasty/commit/84e31fe1efe220505d8969ec8bc63efa6ede0b9e) Thanks [@tenphi](https://github.com/tenphi)! - ## The CSS property list is generated from MDN/W3C data

  `known-property` matched style keys against a hand-written list of 332 CSS properties.
  Tasty renders any camelCase key straight through to its kebab-case declaration, so
  anything the list had not caught up with was reported as a typo on valid CSS:

  ```ts
  tasty({
    styles: {
      maskSize: 'cover', // Unknown style property 'maskSize'.
      anchorName: '--trigger', // Unknown style property 'anchorName'.
      viewTransitionName: 'card', // Unknown style property 'viewTransitionName'.
      fieldSizing: 'content', // Unknown style property 'fieldSizing'.
    },
  });
  ```

  The list is now generated from [`known-css-properties`][kcp] — the MDN/W3C-sourced
  dataset stylelint uses for `property-no-unknown` — taking it from 332 to 818 entries.
  That covers the whole modern surface, including masking, anchor positioning, view
  transitions, `text-box-*`, `field-sizing`, `reading-flow`, the `item-flow` family, and
  SVG presentation and geometry properties (`cx`, `r`, `d`).

  Seventeen `corner-*-shape` properties ship in Chromium but have not landed in the
  dataset yet, so they are carried in a small hand-maintained supplement. A guard test
  prunes each entry once the dataset covers it.

  Regenerate after bumping the dataset — do not edit the list by hand:

  ```sh
  pnpm generate:css-properties
  ```

  `valid-transition` reads the same list, so `transition: 'mask-size 0.3s'` is accepted
  too.

  This widens the list; it does not loosen the rule. Misspellings are still reported,
  including near-misses of the newly recognized properties — `markSize` is a typo of
  `maskSize`, not a property.

  [kcp]: https://github.com/known-css-properties/known-css-properties

## 1.0.3

### Patch Changes

- [#44](https://github.com/tenphi/eslint-plugin-tasty/pull/44) [`d1e8ae6`](https://github.com/tenphi/eslint-plugin-tasty/commit/d1e8ae623127269c6c30dfdb8a6a52dce432102a) Thanks [@tenphi](https://github.com/tenphi)! - ## An unmistakable shape now overrules the variable-name guess

  1.0.2 let a type annotation decide whether an object is tasty styles. Plenty of raw-CSS
  objects carry no annotation at all, though, and for those the name was still the only
  evidence — so this kept being linted as tasty:

  ```ts
  const tableStyles = {
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', borderBottom: '1px solid #eee' },
    td: { padding: '12px', borderBottom: '1px solid #eee' },
  };
  ```

  It reported `known-property` on each HTML tag name, read every block as a state map and
  demanded a default, and offered `no-raw-color-values` rewrites that are only meaningful
  inside tasty.

  The shape is unmistakable, so it now overrules the name. An object reached **only** through
  the name heuristic is skipped when every top-level key is a block name rather than a style
  key — not a known property, not a sub-element (capitalised), not an at-rule, state,
  custom-property or colour key — **and** every top-level value is an object literal.

  Both halves matter. Requiring every value to be an object is what stops this swallowing the
  case it would hurt most:

  ```ts
  const styles = { colour: 'red' }; // still reported — the value is a string, not a block
  ```

  Without that clause, the rule that catches a misspelled property would be silenced by the
  misspelling. And one recognisable key is enough to keep the whole object in scope, so
  `{ padding: '1x', td: {…} }` and `{ Icon: {…}, td: {…} }` are still linted.

  This only applies where the name was the sole evidence. An import-tracked `tasty()` call, a
  `styles` key or JSX prop, and a `Styles` annotation are all unaffected.

## 1.0.2

### Patch Changes

- [#42](https://github.com/tenphi/eslint-plugin-tasty/pull/42) [`d8cacfb`](https://github.com/tenphi/eslint-plugin-tasty/commit/d8cacfbdd8e4f516bf6e106b02669633359027b2) Thanks [@tenphi](https://github.com/tenphi)! - ## A declared type now decides whether an object is tasty styles

  `isStyleVariableDeclaration` matched on the variable _name_ — `styles`, or anything
  ending in `Styles` — and consulted the type annotation only as a way to opt a
  differently-named variable _in_. An explicit annotation could never opt one **out**, so a
  React inline-style object was treated as tasty styles:

  ```ts
  // Reported as tasty style properties, and rewritten by --fix.
  const styles: { wrapper: CSSProperties; region: CSSProperties } = {
    wrapper: { boxShadow: '0px 1px 6px 0px var(--shadow-sm-color)' },
  };
  ```

  This is the more serious half of the two false positives from the same rollout that
  produced #40, and it is not merely noise. The rewrites these rules offer — `#purple.05`,
  `$font-sans`, `#shadow-sm` — are correct **tasty declarations** and meaningless as raw
  CSS. Applied to an object handed to React's `style={…}`, where nothing resolves a tasty
  token, `--fix` turned a real `var(--shadow-sm-color)` into `#shadow-sm` and the browser
  dropped the declaration. Two files in one downstream codebase were affected, and both had
  to carry file-level `oxlint-disable` comments to keep the rule usable.

  An annotation is the author stating what the object is, so it now wins over the name
  guess, in both directions:

  | declaration                                       | verdict                  |
  | ------------------------------------------------- | ------------------------ |
  | `const styles: CSSProperties = …`                 | not tasty                |
  | `const styles: Record<string, CSSProperties> = …` | not tasty                |
  | `const styles: { a: CSSProperties } = …`          | not tasty                |
  | `const anything: Styles = …`                      | tasty                    |
  | `const anything: Record<string, Styles> = …`      | tasty                    |
  | `const anything: Styles \| undefined = …`         | tasty                    |
  | `const styles = …` (no annotation)                | tasty, by name as before |

  The check walks the whole annotation rather than matching only its outermost reference, so
  a wrapped tasty type still opts in. It stays name-based on `Styles`: the plugin has no type
  checker, and requiring one would make every rule type-aware.

  Unannotated raw-CSS objects that happen to be named `styles` are still matched — that is
  inherent to a syntax-only linter, and the name is the only evidence available.

## 1.0.1

### Patch Changes

- [#40](https://github.com/tenphi/eslint-plugin-tasty/pull/40) [`8a24375`](https://github.com/tenphi/eslint-plugin-tasty/commit/8a24375d591ca34ba38c7dad9731bf5fe17cbe3f) Thanks [@tenphi](https://github.com/tenphi)! - ## `prefer-custom-property-syntax`: stop the autofix producing declarations the browser drops

  Two bugs, both of which silently deleted CSS. They were found by wiring this rule into a
  large codebase, running `eslint --fix`, and then diffing every changed value through
  `renderStyles` — nothing else surfaced them, because there is no error at any stage: the
  fix applies, the build passes, and the declaration is discarded at computed-value time.

  ### `-color` matched in the middle of a name

  `COLOR_PROP_REGEX` used `\b` after `-color`, and `\b` matches between `color` and a
  following `-`. So `$purple-color-rgb` matched as `$purple-color` and was rewritten to
  `#purple-rgb`, and `$cui-text-color-secondary` became `#cui-text-secondary`.

  In practice this cascaded across two `--fix` passes: `var(--purple-color-rgb)` became
  `$purple-color-rgb` on the first (correct — `$x` is `var(--x)`), then `#purple-rgb` on the
  second, which renders `var(--purple-rgb-color)`. That property does not exist. `-color` must
  now end the identifier, so both names are left alone; `$purple-color` still converts.

  ### Suggesting a token form the property cannot expand

  Tasty expands `$name` and `#name` **per property**, not globally, and this rule assumed
  otherwise. `fontFamily` has its own handler that passes the value through verbatim, so
  rewriting `var(--font-sans)` to `$font-sans` emitted a literal `font-family: $font-sans`.
  The colour properties are the mirror image: `fill`, `color` and `backgroundColor` expand
  `#token` but **not** `$name`, so `fill: 'rgb(var(--purple-color-rgb) / .05)'` could not be
  rewritten either — while the very same rewrite is correct on `gap`.

  Each of the three passes now checks that the form it is about to suggest round-trips for
  that property, and suppresses the report when it does not. The guard is per-property rather
  than a blanket mute, so `gap: 'var(--purple-color-rgb)'` is still reported. Suppressing
  rather than warning-without-a-fix is deliberate: the rule is autofixable and runs unattended
  in pre-commit hooks, so an unsafe suggestion is worse than no suggestion.

  The two exception lists live in `constants.ts` and are **derived from tasty, not written by
  hand** — `constants.round-trip.test.ts` rebuilds both against the installed runtime and
  fails on drift, including a regression assertion for each of the three declarations above.
  That guard is why `@tenphi/tasty` and `react` are now **devDependencies**; the optional-peer
  stance is unchanged, since the plugin still has no runtime dependency on tasty.

## 1.0.0

### Major Changes

- [#38](https://github.com/tenphi/eslint-plugin-tasty/pull/38) [`60dbc05`](https://github.com/tenphi/eslint-plugin-tasty/commit/60dbc05558877991f93b52d1a0aaf4c0ed7c07a2) Thanks [@tenphi](https://github.com/tenphi)! - ## Target `@tenphi/tasty` v3

  The plugin now validates the v3 style DSL. Most of the upgrade is mechanical: the renamed at-rule keys are reported with an auto-fix, so `eslint --fix` handles them.

  For tasty v2, pin `@tenphi/eslint-plugin-tasty@^0.11`. `@tenphi/tasty >=3` is declared as an optional peer dependency so a v2 pairing is flagged by the package manager rather than surfacing as spurious at-rule rename errors. It stays optional because the plugin has no runtime dependency on tasty — it validates source text.

  ### `$$name(...)` CSS function calls no longer error

  v3 adds CSS `@function` support, invoked as `$$name(...)`. Because bare `$$name` is the custom-property reference `transition` uses, the classifier's `$$` branch ran first and rejected the call form outright — `padding: '$$negative(10px)'` produced a hard `valid-value` **error**, and `valid-custom-property` demanded that `$negative` be declared as a token.

  Calls are now recognized as a distinct `tasty-function` token before the bare-reference check, and the `valid-custom-property` / `valid-color-token` regexes no longer match a name followed by `(`. The bare `$$name` / `##name` forms are unchanged, so `transition: '$$gradient-angle 0.3s'` still validates. A malformed name (`$$9bad(10px)`) still reports.

  ### At-rule keys use the CSS at-rule spelling

  v3 renamed the camelCase keys to match the at-rules Tasty already emitted. `valid-styles-structure` reports the old spellings with a fix:

  ```
  '@properties'   ->  '@property'
  '@fontFace'     ->  '@font-face'
  '@counterStyle' ->  '@counter-style'
  ```

  `@function` is recognized as a special key and its value is structure-checked. Previously every `@`-prefixed key was accepted unconditionally, so v3 code got no validation at all and v2 code got no migration signal.

  The at-rule list is now also used consistently: `isStateMap` excludes all five at-rule keys (it previously excluded only `@keyframes` and `@properties`, so a `@font-face` or `@counter-style` descriptor map could be mistaken for a state map), and `valid-value` skips all of them.

  ### One value per directional group

  v3 dropped the positional multi-value form. Values and modifiers are bucketed separately per comma group, so `'2x 4x top right'`, `'2x top 4x right'`, and `'top 2x right 4x'` were the same input and the pairing depended on which order the _modifiers_ happened to appear in. `valid-directional-modifier` now reports a group that names directions and carries more than one value:

  ```
  padding: '2x 4x top right'   ->  padding: '2x top, 4x right'
  fade:    '3x 1x top bottom'  ->  fade:    '3x top, 1x bottom'
  ```

  Applies to `padding`, `margin`, `inset`, `scrollMargin`, and `fade`. Not to `border` (a group carries width + style + color) or `radius` (`leaf`/`backleaf` take two values) — neither uses the positional per-side form. Groups that name no direction keep plain CSS shorthand order, so `padding: '1x 2x 3x 4x'` and `fade: '3x 1x'` are still valid, as is a CSS-wide keyword alongside a direction (`padding: 'inherit top'`). `inset`'s `dock` keeps its two-value form; a third value reports.

  The rule now parses with the shared value parser instead of splitting on whitespace, which is what makes comma groups visible to it.

  ### `valid-directional-modifier` message and scope

  A direction outside a property's own set (`padding: '1x top-left'`) now reports with the accepted list rather than the misleading "does not support directional modifiers", and the rule no longer descends into `$` affix values (a selector, not a value — `$: '.active'` was read as an unknown unit), sub-element keys, or at-rule blocks.

  The rule still skips properties with no directional vocabulary, which makes the "wrong property" case (`fill: '#purple top'`) unreachable. That gate looks like a bug but is load-bearing: direction words are ordinary CSS _values_ for a long tail of properties — `verticalAlign: 'bottom'`, `textAlign: 'left'`, `transformOrigin: 'top center'`, `backgroundPosition`, `objectPosition`, `float`, `clear`, `scrollSnapAlign`, and `transition`, whose value names properties that can themselves be `left`/`top`. Removing it reported 20 errors across `@cube-dev/ui-kit`, every one a false positive. Catching a stray `fill: '#purple top'` is not worth an allowlist of every property that takes a positional keyword. All 20 cases are now regression tests.

  ### `scrollMargin` accepts directional modifiers

  It shares tasty's directional engine but was missing from the modifier table, so `scrollMargin: '2x top'` reported as an unsupported property.

  ### `meta.version` reports the real version

  It was a hardcoded `'0.1.0'` literal that had drifted from the released version. Now read from `package.json`, with a test asserting the two match so it cannot drift again.

  ### Detection reaches Storybook stories and `styles` JSX props

  Two shapes were silently unchecked, so v3-invalid styles passed lint entirely:
  - a Storybook story's `args.styles` — the enclosing variable is named after the story and there is no Tasty call, so neither the variable-name nor the call-site heuristic reached it
  - `<Block styles={{ … }} />` — described in `SPECIFICATION.md` but never implemented

  Both now count as style objects. A bare `styles` key elsewhere still does **not**: plenty of unrelated libraries take a `styles` option object, and the key alone is no evidence it is Tasty's. A `styles` JSX prop is safe to match on name alone, since React's own prop is `style`, singular.

  Found by running the plugin over `@cube-dev/ui-kit`, where an `inset: '2x bottom 4x left'` in a story had gone unreported.

  Overlapping selectors are now deduped per object, so a shape matching two selectors — `tasty({ styles: {…} })` matches both the call-site and the `styles`-key selector — reports once instead of twice.

  ### `fade` accepts `true`

  It was missing from the boolean-property list, so `fade: true` was reported as invalid. It works: the value falls back to `calc(2 * var(--gap))`, a token-following default that no explicit value can express.

  ### Config: `funcs` is now `functions`

  Matching tasty's `TastyExtensionConfig`, which has always declared `functions` — the plugin read `funcs`, so a `functions: [...]` list in a shared `tasty.config.ts` was silently ignored and custom function names were never validated. `funcs` is still read as a deprecated alias.

## 0.11.4

### Patch Changes

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Point `fontFamily` at `preset` instead of `font` for CSS-wide keywords.

  `font` resolves to `<value>, var(--font-sans, var(--font-sans-fallback))`, so it cannot express a CSS-wide keyword — following the hint for `fontFamily: 'inherit'` emits `font-family: inherit, var(--font-sans, …)`, which is invalid and drops the inherit entirely. The rule was steering authors toward broken CSS:

  ```js
  tasty({ styles: { fontFamily: 'inherit' } });
  // warning: Prefer tasty shorthand 'font: '...'' instead of 'fontFamily'
  ```

  `preset` is the property that handles these. A CSS-wide keyword used as the preset name short-circuits token lookup and is emitted verbatim across the whole typography group, so `preset: 'inherit'` produces a real `font-family: inherit`. The hint now names it:

  ```
  Prefer tasty shorthand 'preset: 'inherit'' instead of 'fontFamily'
  ```

  Applies to `inherit`, `initial`, `unset`, `revert` and `revert-layer`. A real font stack (`fontFamily: 'Inter'`) still points at `font: '...'`. The rule stays report-only for `fontFamily` either way — the two forms differ in scope (`preset` covers the whole typography group), so this is not a safe rename.

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Stop `valid-transition` reporting kebab-case CSS property names as unknown.

  A `transition` value names **CSS** properties, so they are spelled kebab-case — and Tasty emits any name it has no semantic mapping for verbatim into the CSS `transition`, which makes the kebab form the correct one. `KNOWN_CSS_PROPERTIES` is keyed by camelCase style keys, though, and the membership test used the raw name, so every kebab-case property without a `TRANSITION_SEMANTIC_MAPPING` entry was reported:

  ```
  warning tasty(valid-transition): Unknown transition name 'text-decoration-color'.
  ```

  The gap was invisible for the common cases because `TRANSITION_SEMANTIC_MAPPING` lists both spellings (`'background-color'` alongside `backgroundColor`) and is consulted first — so only properties absent from that map, such as `text-decoration-color` and `text-underline-offset`, hit the bad lookup.

  The name is now normalized to camelCase before the `KNOWN_CSS_PROPERTIES` check. Raw custom properties (`--gradient-angle`) are also accepted — `transition.ts`'s `getTiming()` handles that form explicitly.

- [#36](https://github.com/tenphi/eslint-plugin-tasty/pull/36) [`f07475b`](https://github.com/tenphi/eslint-plugin-tasty/commit/f07475ba5282ea076c57cf5c9a915ba6400af424) Thanks [@tenphi](https://github.com/tenphi)! - Accept the `longhand` output modifier on box properties in `valid-value`.

  `longhand` forces a box property to emit the individual CSS longhands instead of the shorthand, so children can selectively inherit a single side or corner (`radius: 'inherit right'`). It is documented for `padding`, `margin`, `inset`, `border` and `radius`, and honoured by the corresponding style handlers — but it was missing from every `acceptsMods` list in `PROPERTY_EXPECTATIONS`, so `valid-value` rejected the documented syntax as an error:

  ```
  error tasty(valid-value): Modifier 'longhand' is not valid for 'radius'.
                            Accepted: top, right, bottom, left, top-left, …
  ```

  `longhand` is now accepted on those five properties. `fade` and `outline` are unchanged — neither style handler reads the modifier.

  Added valid-case coverage for all five properties to `valid-value.test.ts`.

## 0.11.3

### Patch Changes

- [#34](https://github.com/tenphi/eslint-plugin-tasty/pull/34) [`5bc80aa`](https://github.com/tenphi/eslint-plugin-tasty/commit/5bc80aa89189d712c0bd53069780d6e5fdc2080d) Thanks [@tenphi](https://github.com/tenphi)! - Stop reporting sub-element styles twice in `consistent-token-usage`, `no-important` and `no-raw-color-values`.

  `STYLE_OBJECT_SELECTORS` includes the descendant selector `CallExpression ObjectExpression`, so inside `tasty({ styles: { Icon: { … } } })` the handler fires for the `styles` object **and** for the `Icon` object. These three rules recursed into any nested `ObjectExpression` as if it were a state map, so a sub-element's declarations were reported once while walking `styles` and again when the listener reached the sub-element itself:

  ```js
  tasty({ styles: { Icon: { width: '64px' } } });
  // consistent-token-usage: "Consider using '8x' instead of '64px'"  x2
  ```

  The recursion is now guarded by the existing `isStateMap()` helper, which excludes sub-elements (keys starting with an uppercase letter). `prefer-hide` and `prefer-custom-property-syntax` were already immune — the former only looks at the `display` key, the latter skips `/^[A-Z@&$#]/` keys explicitly.

  The duplicate report was the visible symptom, but the same code path also attributed the value to the **wrong property**, since the sub-element name was passed down as the property name. That silently affected rule behaviour rather than just the message count:
  - `no-raw-color-values` scopes its named-colour check to colour-bearing properties, so `Icon: { fill: 'red' }` was checked against the property `Icon`.
  - `consistent-token-usage` special-cases `radius` (`6px` → `1r`) and `border` (`1px` → `1bw`), which could not match when the property name was a sub-element.

  Genuine state maps — including state maps nested inside a sub-element, e.g. `Icon: { fill: { '': 'red' } }` — are unaffected and still reported exactly once. Added regression tests to all three rules covering both directions.

## 0.11.2

### Patch Changes

- [#32](https://github.com/tenphi/eslint-plugin-tasty/pull/32) [`57d7d9e`](https://github.com/tenphi/eslint-plugin-tasty/commit/57d7d9eb02fa3e50b80c038c9530be8263a52edd) Thanks [@tenphi](https://github.com/tenphi)! - Only treat `styles` and `*Styles` variables as style objects.

  The name test was `/styles?$/i`, which also matched the **singular** `style` — conventionally a DOM inline-style object holding raw CSS longhands, not tasty syntax. Every rule then ran against those objects and reported their longhands as violations:

  ```js
  // reported `top`, `left`, `right`, `bottom` and `maxWidth` as tasty problems
  const style = { position: 'absolute', top: '0px', maxWidth: '100%' };
  setStyle(element, style);
  ```

  `cube-ui-kit` had 5 findings from a single such object, plus more from `hostStyle: CSSProperties` and `baseStyle: Record<string, string>`.

  Detection is now `name === 'styles' || name.endsWith('Styles')`. An explicit `Styles` type annotation still opts a differently-named variable in, and the existing exclusion of `SCREAMING_CASE` names is unchanged.

  Added `src/context.test.ts` covering both directions. It probes through `prefer-shorthand-property` rather than `known-property`, because the properties involved (`top`, `maxWidth`) are perfectly _known_ — a `known-property` probe stays silent either way and would not catch this regression.

## 0.11.1

### Patch Changes

- [#30](https://github.com/tenphi/eslint-plugin-tasty/pull/30) [`23bdb86`](https://github.com/tenphi/eslint-plugin-tasty/commit/23bdb86820236944df696e5d906a584bb4712d4a) Thanks [@tenphi](https://github.com/tenphi)! - Fix `valid-value` rejecting the `dock` modifier that `prefer-directional-shorthand` auto-fixes to.

  0.11.0 taught the fixer to emit `inset: '0 bottom dock'` but did not add `dock` to `inset`'s modifier allowlist, so running `eslint --fix` turned a warning into an error:

  ```
  error tasty(valid-value): Modifier 'dock' is not valid for 'inset'.
                            Accepted: top, right, bottom, left.
  ```

  `dock` is now accepted for `inset` (and only `inset`) by both `valid-value` and `valid-directional-modifier`.

  Added an integration test that applies `prefer-directional-shorthand`'s fixes and re-lints the output against the whole `recommended` set, so a fix that emits a token the validation rules do not know about fails the suite instead of shipping.

## 0.11.0

### Minor Changes

- [#28](https://github.com/tenphi/eslint-plugin-tasty/pull/28) [`88dddd2`](https://github.com/tenphi/eslint-plugin-tasty/commit/88dddd23125ec95e52c0ab91e393d50776be4b80) Thanks [@tenphi](https://github.com/tenphi)! - Extend `prefer-directional-shorthand` to `radius`, `fade` and `border`, and teach it the `inset` `dock` modifier.

  0.10.0 restricted the rule to `margin`, `padding` and `inset` because the other properties had no lossless target. `@tenphi/tasty` 2.10 adds the two missing forms — single-corner `radius` modifiers and the `inset` `dock` modifier — so those rewrites are now expressible and the rule covers them. **Requires `@tenphi/tasty` >= 2.10** for the newly suggested syntax.

  **`radius` (auto-fixable)** — positions are corners, not sides, so the suggestion uses corner names:

  ```
  radius: '0 1r 0 0'  ->  radius: '1r top-right'
  radius: '4px 0 0 0' ->  radius: '4px top-left'
  ```

  **`inset` with `dock` (auto-fixable)** — three equal offsets around a single `auto` is one edge pinned with the perpendicular pair spanned:

  ```
  inset: 'auto 0 0 0' ->  inset: '0 bottom dock'
  inset: '0 0 0 auto' ->  inset: '0 right dock'
  ```

  **`fade` (auto-fixable)** — the extra groups in a 4-value `fade` are zero-length gradients, which are a no-op under `mask-composite: intersect`, so collapsing is equivalent and emits one mask layer instead of four:

  ```
  fade: '0 0 2x 0'    ->  fade: '2x bottom'
  ```

  **`border` (report-only, with a manual suggestion)** — four `border` tokens parse as a _single_ border value (width/style/color), not as a box, so `border: '0 0 1bw 0'` currently emits `border: 0 solid …` — no border on any side. The directional form is what the author meant, but applying it changes what renders, so the rule reports it with an explanation and offers the rewrite as an editor suggestion rather than an `eslint --fix`.

  **Suggestions always keep the explicit value** and never drop it in favour of the property default, because whether the two match is project-dependent. `margin` defaults to `var(--gap)` — 4px out of the box — while `1x` is 8px, so `margin: '0 0 1x 0'` -> `margin: 'bottom'` would silently halve the spacing. The rule emits `margin: '1x bottom'`.

  `DIRECTIONAL_BOX_IDENTITY` is replaced by `DIRECTIONAL_BOX`, which carries the identity token, the position names and whether the rewrite is auto-fixable per property.

## 0.10.0

### Minor Changes

- [#26](https://github.com/tenphi/eslint-plugin-tasty/pull/26) [`eccdd9d`](https://github.com/tenphi/eslint-plugin-tasty/commit/eccdd9dad5f92d175929b464d64f30ddff784dde) Thanks [@tenphi](https://github.com/tenphi)! - Reverse the `flex` mapping and stop `prefer-directional-shorthand` from dropping real values.

  **`flex` is now the discouraged property, not the target.** `prefer-shorthand-property` previously mapped `flexGrow` / `flexShrink` / `flexBasis` → `flex`, which is backwards: `flex` resets the components you omit to values that are not their CSS initial. `flex: '0'` expands to `flex-grow: 0; flex-shrink: 1; flex-basis: 0%`, so it cannot express `flexShrink: 0` ("do not shrink") at all — following the old advice inverted the author's intent. The three longhand mappings are removed, and a new **`prefer-longhand-property`** rule reports `flex` in favour of `flexGrow` / `flexShrink` / `flexBasis` (`error` in `recommended`). The longhands also each carry their own state map, which `flex` cannot.

  **`prefer-directional-shorthand` is now identity-aware and no longer suggests lossy rewrites.** The rule hard-coded `0` as the placeholder for an unset side, which is only correct for properties whose CSS initial is `0`:
  - **`inset`** — the initial is `auto`, so a `0` is a real offset. `inset: 'auto 0 0 0'` was reported as `'auto top'`, which emits `inset: auto` and silently drops three real values. `inset` is now checked against an `auto` identity, so that case is valid and `inset: '0 auto auto auto'` → `'0 top'` still reports.
  - **`radius`** — the four positions are corners, and a directional modifier addresses a corner _pair_ (`radius: '4px bottom'` rounds both bottom corners). A single-corner value has no directional equivalent, so `radius` is excluded.
  - **`border`** — four tokens parse as one border value (width/style/color), not as a box, so there are no per-side placeholders to collapse. Excluded.
  - **`fade`** — each side becomes its own gradient layer, so collapsing changes the emitted `mask`. Excluded.

  `margin` and `padding` are unaffected and still auto-fix.

## 0.9.0

### Minor Changes

- [#24](https://github.com/tenphi/eslint-plugin-tasty/pull/24) [`84afaa0`](https://github.com/tenphi/eslint-plugin-tasty/commit/84afaa0e89cff1d529489526c5edb8f85518256d) Thanks [@tenphi](https://github.com/tenphi)! - Add auto-fix and suggestion support to fixable rules, enforce `_` floor ordering, and reclassify `no-nested-selector` as an error.

  **Auto-fixable (`fixable: 'code'`, applied by `eslint --fix`):**
  - `no-important`: strips `!important` from style values.
  - `prefer-auto-calc`: rewrites `calc(x)` → `(x)` per occurrence.
  - `prefer-directional-shorthand`: rewrites 4-value box syntax with zero placeholders to directional shorthand (`1x bottom`).
  - `prefer-shorthand-property`: renames the safe carry-over subset of native CSS keys to Tasty shorthands (`backgroundColor` → `fill`, `borderRadius` → `radius`). Directional / `min|max` / `border-*` / `image` mappings stay report-only because the rename changes runtime semantics.
  - `no-own-at-root`: unwraps redundant `@own(inner)` → `inner` on the state key.
  - `valid-default-state-order`: fixes misplaced `''` default and `_` floor (move/remove), and now treats `''` as redundant when `_` is the only other state.
  - `prefer-custom-property-syntax`: rewrites `var(--x)` → `$x`, `var(--x, fb)` → `($x, fb)` (incl. `transparent`/`currentColor` fallback normalization), `$x-color` → `#x`, `transparent` → `#clear`, and `currentColor` → `#current`.
  - `prefer-hide`: rewrites `display: 'none'` → `hide: true` (direct-value case only; state-map case stays report-only).

  **Suggestions (`hasSuggestions: true`, manual quick-fix):**
  - `valid-transition`: offers a semantic-name swap for `preferSemanticTransition` (e.g. `background-color` → `fill`); `unknownTransition` stays report-only.
  - `consistent-token-usage`: offers `8px` → `1x`, `6px` → `1r` (radius), and `1px` → `1bw` (border).
  - `valid-radius-shape`: offers the closest valid shape when one is found.

  **`valid-default-state-order` is now `_`-fallback-aware:** the `_` fallback floor must be the first key in a state map, with the `''` default right after it — matching the runtime cascade order. This fixes a latent false-positive that flagged the correct `{ _: …, '': …, hovered }` order. Maps where `''` is the only other state besides `_` now report `redundantDefaultState`.

  **`no-nested-selector` reclassified:** it is now a non-fixable `problem` (incorrect syntax, not a style preference) and defaults to `error` in the `recommended` preset.

- [#24](https://github.com/tenphi/eslint-plugin-tasty/pull/24) [`84afaa0`](https://github.com/tenphi/eslint-plugin-tasty/commit/84afaa0e89cff1d529489526c5edb8f85518256d) Thanks [@tenphi](https://github.com/tenphi)! - Extend `no-raw-color-values` and `prefer-custom-property-syntax` with new raw-syntax warnings (all in the `recommended` preset at `warn`):
  - `no-raw-color-values` now also flags modern color functions (`okhsl`, `okhsv`, `okhst`, `oklab`, `oklch`, `lab`, `lch`, `hwb`, `color`, `device-cmyk`, `light-dark`) and CSS named colors (`red`, `blue`, …) on color-bearing properties. Named-color checks skip `#token` and `$prop` references to avoid false positives.
  - `prefer-custom-property-syntax` now also suggests `#color` for `$x-color` custom-property references, `#clear` for the `transparent` keyword, and `#current` for the `currentColor` keyword. `var(--x, transparent)` / `var(--x, currentColor)` fallbacks are normalized to `#clear` / `#current` in the suggestion.

## 0.8.0

### Minor Changes

- [`87584bf`](https://github.com/tenphi/eslint-plugin-tasty/commit/87584bf3581762a3745034c77d4334b6a483bf39) Thanks [@tenphi](https://github.com/tenphi)! - Add "prefer Tasty syntax" rules and promote them to the recommended config:
  - **`valid-default-state-order`** — warn when `''` is not the first state key or is redundant alongside lone `_`
  - **`prefer-auto-calc`** — suggest `(...)` instead of `calc(...)`
  - **`prefer-custom-property-syntax`** — suggest `$prop` / `(#color, fallback)` instead of `var(--...)`
  - **`prefer-hide`** — suggest `hide: true` instead of `display: 'none'`
  - **`prefer-directional-shorthand`** — suggest `1x bottom` instead of `0 0 1x 0` box syntax
  - Extend **`prefer-shorthand-property`** mappings (`backgroundImage`, `fontFamily`, `flexGrow`/`Shrink`/`Basis`, scrollbar/grid/inset/outline/lineClamp, etc.)
  - Extend **`valid-transition`** with semantic-name suggestions (`background-color` → `fill`, etc.)

  Move `prefer-shorthand-property`, `no-raw-color-values`, and `consistent-token-usage` from strict into recommended (all `warn`).

  Improve error messages across existing rules to state what is wrong and how to fix it.

## 0.7.0

### Minor Changes

- [`d52f870`](https://github.com/tenphi/eslint-plugin-tasty/commit/d52f87036ae27a928f81a0541964de5e97c8386e) Thanks [@tenphi](https://github.com/tenphi)! - Support the `_` fallback floor key in state maps. A standalone `_` is now accepted as a valid state key (an always-on, map-wide fallback floor), `valid-state-key` reports an error when `_` is combined with other state logic (e.g. `_ & hovered`), `require-default-state` accepts a `_` floor as satisfying the default requirement, and `valid-styles-structure` flags a `_` key used at the top level. Docs updated accordingly.

## 0.6.4

### Patch Changes

- [`9adb26e`](https://github.com/tenphi/eslint-plugin-tasty/commit/9adb26e81082f69a7135669d527d05917d6d9415) Thanks [@tenphi](https://github.com/tenphi)! - Update `valid-preset` rule to accept multiple space-separated modifiers in the slash section (e.g. `preset="h1 / strong italic"`) and in the modifier-only shorthand (e.g. `preset="bold italic"`). Each modifier token is now validated individually against the known modifier set, so unknown modifiers are reported per-token instead of treating the whole segment as one name.

## 0.6.3

### Patch Changes

- [`60f9235`](https://github.com/tenphi/eslint-plugin-tasty/commit/60f92356d0547bfde701ceb0c2701986f1c68bad) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive in `valid-state-key` rule: `@root()`, `@parent()`, and `@own()` tokenizer patterns now handle nested parentheses from pseudo-classes like `:is()`, `:has()`, `:not()`, and `:where()` (e.g. `@parent(:is(details), >)`).

## 0.6.2

### Patch Changes

- [`d7f869c`](https://github.com/tenphi/eslint-plugin-tasty/commit/d7f869c00099457fc6d819608e056f0a03eac474) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive in `valid-transition` rule: allow `##name` color property references (e.g. `##theme 0.3s`) alongside the existing `$$name` custom property references.

## 0.6.1

### Patch Changes

- [#16](https://github.com/tenphi/eslint-plugin-tasty/pull/16) [`300c8c8`](https://github.com/tenphi/eslint-plugin-tasty/commit/300c8c894961afbcbf69762271a31233427940f7) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive warnings: add missing CSS functions (calc-size, math, anchor, scroll-driven, etc.), allow color tokens in `fade` property, allow `false` to disable sub-element styles, and recognize SVG presentation attributes as known CSS properties.

## 0.6.0

### Minor Changes

- [#14](https://github.com/tenphi/eslint-plugin-tasty/pull/14) [`229311d`](https://github.com/tenphi/eslint-plugin-tasty/commit/229311d0e125ea97ee3bdd546d1aa4acbc3efffc) Thanks [@tenphi](https://github.com/tenphi)! - Update valid-preset rule to support slash-separated modifier syntax (`h2 / strong`) and add `bold` and `icon` to known preset modifiers.

## 0.5.1

### Patch Changes

- [`6e5b1c3`](https://github.com/tenphi/eslint-plugin-tasty/commit/6e5b1c3ef2247ea86fce6e77a1f1a5e72e785acf) Thanks [@tenphi](https://github.com/tenphi)! - Recognize `@inherit` as a valid value in `tasty/valid-value` rule. Extract `@own()` at root level check from `tasty/valid-state-key` into a new `tasty/no-own-at-root` rule configured as a warning in the recommended config.

## 0.5.0

### Minor Changes

- [`e92ce58`](https://github.com/tenphi/eslint-plugin-tasty/commit/e92ce5874a5e2c257d31828f72bc9a6b25468246) Thanks [@tenphi](https://github.com/tenphi)! - Cascading config resolution and false-positive fixes.
  - Config files (`tasty.config.ts`) are now merged from all directories between the linted file and the project root, with nearest having the highest priority. This enables per-directory config overrides without duplicating parent settings.
  - The `@tenphi/tasty` package config is auto-discovered from `node_modules` and used as the implicit base layer. Explicit `extends: '@tenphi/tasty'` is no longer needed.
  - Added missing CSS properties to the known set: all `scrollMargin*` and `scrollPadding*` directional variants, and `textSizeAdjust`.
  - Added grid layout properties (`gridArea`, `gridColumn`, `gridRow`, and their start/end variants) to the skip list since they accept arbitrary named identifiers.
  - Fixed false-positive `unknownToken` reports for passthrough properties (e.g., `textOverflow: 'ellipsis'`).

## 0.4.4

### Patch Changes

- [`ec0ed06`](https://github.com/tenphi/eslint-plugin-tasty/commit/ec0ed061fc145aab1e12457c4362600c262b4f79) Thanks [@tenphi](https://github.com/tenphi)! - Fix false positive "unknown state alias" warnings for locally defined states. The `valid-state-key` and `no-unknown-state-alias` rules now recognize `@name` keys with string values defined at the top level of the same `styles` object as valid local predefined state aliases, matching the runtime behavior of `extractLocalPredefinedStates()`.

## 0.4.3

### Patch Changes

- [`6bd12ae`](https://github.com/tenphi/eslint-plugin-tasty/commit/6bd12ae5ec1befef430abb1147dc676f873ced67) Thanks [@tenphi](https://github.com/tenphi)! - Support imports in `tasty.config.ts` via jiti, enabling dynamic token lists derived from theme files.

## 0.4.2

### Patch Changes

- [`83752d9`](https://github.com/tenphi/eslint-plugin-tasty/commit/83752d90fc16c6402948a56808fe380f6298035e) Thanks [@tenphi](https://github.com/tenphi)! - Fix preset validation.

## 0.4.1

### Patch Changes

- [`96a1b1c`](https://github.com/tenphi/eslint-plugin-tasty/commit/96a1b1c86aa9d2a2cddfabc4e8b871a89026944e) Thanks [@tenphi](https://github.com/tenphi)! - Fix false-positive warnings for preset values, transition semantic names, and SCREAMING_CASE variable names
  - Skip `preset` and `transition` properties in `valid-value` rule since they have dedicated validation rules (`valid-preset`, `valid-transition`)
  - Add missing semantic transition names (`text`, `opacity`, `translate`, `rotate`, `scale`, `filter`, `image`, `background`, `width`, `height`, `zIndex`) to `SEMANTIC_TRANSITIONS`
  - Exclude SCREAMING_CASE variable names (e.g. `TINT_STYLES`) from the style-object detection heuristic to avoid false `known-property` warnings on non-style objects

## 0.4.0

### Minor Changes

- [`50b5d97`](https://github.com/tenphi/eslint-plugin-tasty/commit/50b5d970aa65ee076d309c7eba360d57800ecb31) Thanks [@tenphi](https://github.com/tenphi)! - Improve various rules and bring own parser for enchanced validation.

## 0.3.1

### Patch Changes

- [`a15ee6a`](https://github.com/tenphi/eslint-plugin-tasty/commit/a15ee6a6d39e4297803a30e443ecdeac68ef4483) Thanks [@tenphi](https://github.com/tenphi)! - Fix `@parent(...)` being flagged as an unknown state alias by adding `@parent` to `BUILT_IN_STATE_PREFIXES`. Also handle `parent` type in `collectIssues` for recursive inner condition validation.

## 0.3.0

### Minor Changes

- [`fd9d0b9`](https://github.com/tenphi/eslint-plugin-tasty/commit/fd9d0b92731f46753c5a4a5ba4e978336bc317b8) Thanks [@tenphi](https://github.com/tenphi)! - Detect style objects in variable declarations (not only inside `tasty()` calls). Variables with names ending in `style`/`styles` (case-insensitive) or typed as `Styles` are now validated. Handles TypeScript type annotations (`TSAsExpression`, `TSSatisfiesExpression`, etc.).

  Move `valid-recipe` and `valid-preset` rules to the `recommended` config. Both rules now use the broader `ObjectExpression` selector to catch style variables.

  Fix `valid-preset` to allow CSS global keywords (`inherit`, `initial`, `unset`, `revert`).

  Fix config `extends` resolution to find `tasty.config.*` files inside npm packages (walk `node_modules` instead of `require.resolve`). Strip comments and use balanced brace matching when parsing TS/JS config files.

## 0.2.2

### Patch Changes

- [`401bfe8`](https://github.com/tenphi/eslint-plugin-tasty/commit/401bfe8e513f8cd9c75310fd622a94ea02bcb8a3) Thanks [@tenphi](https://github.com/tenphi)! - Fix false positives across multiple rules:
  - `valid-directional-modifier`: only check properties that actually support directional modifiers (border, radius, padding, margin, fade, inset), skip others like textAlign, transformOrigin, verticalAlign, transition
  - `valid-value`: allow CSS global keywords (inherit, initial, unset, revert, revert-layer) on all properties; accept `inset` mod for shadow, `fixed` mod for width/height, `none`/`transparent` for fill/color
  - `known-property`: allow CSS custom properties (`--*`) and vendor-prefixed properties (`-webkit-*`, etc.); add `container` and `interpolateSize` to known properties
  - `valid-boolean-property`: add `shadow`, `margin`, `inset` to properties that accept boolean `true`
  - `no-nested-selector`: skip `&::` pseudo-element patterns (no sub-element alternative exists)

## 0.2.1

### Patch Changes

- [`3460a12`](https://github.com/tenphi/eslint-plugin-tasty/commit/3460a123d353a68b4cc14708651ffd246bda9f6e) Thanks [@tenphi](https://github.com/tenphi)! - Fix build output to use `.js`/`.d.ts` extensions instead of `.mjs`/`.d.mts`, matching the `exports` map in `package.json`.

## 0.2.0

### Minor Changes

- [`4603b98`](https://github.com/tenphi/eslint-plugin-tasty/commit/4603b9882da80ab43d3628ad5645085615a8d01a) Thanks [@tenphi](https://github.com/tenphi)! - Rewrite `valid-state-key` rule to use the real `parseStateKey` parser from `@tenphi/tasty/core` instead of hand-rolled regex validation. This provides deeper semantic checks including tokenization coverage, empty/invalid advanced state detection, and `@own()` sub-element enforcement.
