# tasty/consistent-token-usage

Warn about pixel lengths in Tasty styles.

**Presets:** warning in recommended and strict. **Fix:** editor suggestions.

## Why

A design system sizes things with its units (`x`, `r`, `bw`) and tokens, so a layout follows its scale. A raw `8px` stays put when the scale changes.

## Checks

The rule reports every nonzero pixel length in recognized style objects and JSX
style props: compound values, comma-separated groups, function arguments, and
numeric inputs to enhanced handlers that convert them to pixels, such as
`gap={17}`. Unitless properties such as `opacity` and `zIndex` are not checked.
Zero, token definitions (`$name` and `#name` keys), quoted CSS text, and URLs
are allowed.

A pixel length with an exact unit gets a suggestion that replaces it:

| Pixels                      | Replacement     |
| --------------------------- | --------------- |
| `8px` to `64px`, step `8px` | `1x` to `8x`    |
| `6px` in `radius`           | `1r`            |
| `1px` in a border width     | `1bw`           |

These replacements assume Tasty's default scale. Review them against your
design system. Any other pixel length, such as `17px` or `520px`, is reported
without a suggestion: the rule does not invent a token. A `fontSize`,
`lineHeight` or `letterSpacing` length never gets an `x` suggestion: it is on
the type scale, which presets set, and `x` is the spacing scale.

A suggestion keeps the rest of the value as written. It is withheld when
JavaScript escapes or JSX entities make the source differ from the value.

```tsx
import { tasty } from '@tenphi/tasty';

// ❌ '1x' and '1bw' replace these exactly.
const Card = tasty({ styles: { padding: '8px', border: '1px solid #border' } });

// ✅ Preferred.
const Card = tasty({ styles: { padding: '1x', border: '1bw solid #border' } });
```

For an intentional pixel length, add an explicit local ignore with a reason:

```tsx
const Rule = tasty({
  styles: {
    // eslint-disable-next-line tasty/consistent-token-usage -- aligns with the 3px focus ring
    inset: '-3px',
  },
});
```

With Oxlint, `// oxlint-disable-next-line` works the same way.

## Options

```js
'tasty/consistent-token-usage': ['error', { pixels: 'replaceable' }],
```

| `pixels`          | Reports                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `'all'` (default) | Every nonzero pixel length                                                     |
| `'replaceable'`   | Only a pixel length with an exact unit in the table above, with its suggestion |

Use `'replaceable'` when your layout sizes are in pixels on purpose, such as
`width: 'max 520px'`. The rule then reports only a length that a unit replaces
exactly, so every finding has a fix and the rule can run as an error. In
`padding: '8px 17px'` it reports `8px` and leaves `17px` alone.
