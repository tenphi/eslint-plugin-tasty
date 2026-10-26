---
'@tenphi/eslint-plugin-tasty': minor
---

`tasty.config.*` can declare the plugin versions it needs, as a semver range in `requires`, such as `requires: '>=1.13.0'`. Every config in the `extends` chain may declare one. When the installed plugin falls outside any of them, linting fails with a message that names the config file, the range and the installed version. A design system can then state what its shared config needs, and a consumer on an older plugin finds out on the first run instead of getting silently different results.

The plugin now also warns, once per config file, about problems it used to drop silently:
- keys it does not read, such as a typo or a key from a newer plugin;
- known keys of the wrong shape, such as `states: '@mobile'`, which used to be read character by character. When the file looks like Tasty's runtime config, with `tokens` as an object, the warning says so;
- an `extends` that is not a string, names a package that cannot be resolved, or names a package without a `tasty.config.*`;
- an `extends` chain that leads back to itself;
- a config that is not an object.

`presetDescriptions` and `stateDescriptions`, which the Tasty VS Code extension reads from the same file, are accepted and typed. A package `extends` can now name a config file inside the package, such as `@my-org/ui/lint/tasty.config`. A relative `extends` that is not a file still fails the run, now with a clear message instead of a file-system error.
