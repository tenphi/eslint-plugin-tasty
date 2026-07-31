---
'@tenphi/eslint-plugin-tasty': patch
---

Stop `valid-transition` reporting kebab-case CSS property names as unknown.

A `transition` value names **CSS** properties, so they are spelled kebab-case — and Tasty emits any name it has no semantic mapping for verbatim into the CSS `transition`, which makes the kebab form the correct one. `KNOWN_CSS_PROPERTIES` is keyed by camelCase style keys, though, and the membership test used the raw name, so every kebab-case property without a `TRANSITION_SEMANTIC_MAPPING` entry was reported:

```
warning tasty(valid-transition): Unknown transition name 'text-decoration-color'.
```

The gap was invisible for the common cases because `TRANSITION_SEMANTIC_MAPPING` lists both spellings (`'background-color'` alongside `backgroundColor`) and is consulted first — so only properties absent from that map, such as `text-decoration-color` and `text-underline-offset`, hit the bad lookup.

The name is now normalized to camelCase before the `KNOWN_CSS_PROPERTIES` check. Raw custom properties (`--gradient-angle`) are also accepted — `transition.ts`'s `getTiming()` handles that form explicitly.
