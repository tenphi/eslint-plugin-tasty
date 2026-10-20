---
'@tenphi/eslint-plugin-tasty': patch
---

Accept TypeScript 6 in the optional `typescript` peer range (`>=5.6.3 <7`), so projects on TypeScript 6 no longer get an unmet peer warning. The experimental `settings.tasty.typeAwareJSX` analysis works unchanged on TypeScript 6, including with tsconfigs that still use options TypeScript 6 deprecates, such as `baseUrl` or `moduleResolution: "node"`. TypeScript 7 is not supported yet: its package no longer exposes the compiler API that `typeAwareJSX` uses.
