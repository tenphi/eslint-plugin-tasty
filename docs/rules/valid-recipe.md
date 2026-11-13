# tasty/valid-recipe

Reports a recipe name in `recipe` that your config does not list.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Tasty drops a recipe it does not know, so the styles it should bring never apply.

## Examples

```js
// ✅ Valid, when tasty.config lists 'card' and 'elevated' in recipes
recipe: 'card elevated'

// ❌ Unknown recipe 'cards'
recipe: 'cards'
```

## Checks

A recipe value is a space-separated list of names. A `/` separates the recipes applied after the component's own styles. `none` means no base recipes.

```text
recipe: 'card elevated'            → ['card', 'elevated']
recipe: 'reset input / autofill'   → before: ['reset', 'input'], after: ['autofill']
recipe: 'none / autofill'          → before: [], after: ['autofill']
```

Each name must be in `recipes` in `tasty.config.*`. Without `recipes` in the config, the rule does nothing.

## Options

None.
