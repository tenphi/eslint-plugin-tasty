---
'@tenphi/eslint-plugin-tasty': patch
---

With TypeScript 7 installed, the experimental `settings.tasty.typeAwareJSX` analysis now fails with a clear error that names the installed version and asks for TypeScript 5.6–6.x. Previously it crashed with `TypeError: T.findConfigFile is not a function`. TypeScript 7's package no longer exposes the JavaScript compiler API that `typeAwareJSX` uses.
