---
'@tenphi/eslint-plugin-tasty': patch
---

Document and verify Oxlint compatibility. The plugin already runs under Oxlint's JS-plugins runtime (all rules use standard AST traversal with no type-aware APIs, custom parsers, or autofixers). Added an end-to-end conformance test that runs the built plugin through the real `oxlint` binary, and a README section covering `.oxlintrc.json` / `oxlint.config.ts` setup with the `tasty` plugin alias.
