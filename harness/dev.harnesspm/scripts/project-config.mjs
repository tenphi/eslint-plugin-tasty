/**
 * The project's own Tasty lint config, so the tools report what the project's
 * lint reports: the level and options of each tasty/* rule, `settings.tasty`,
 * and the files the config ignores. It comes from the nearest Oxlint or ESLint
 * config above a file that loads this plugin: by its name, or through a package
 * in the `importSources` of `tasty.config.*`, as a design system that re-exports
 * Tasty for styles often re-exports this plugin for lint too.
 *
 * Both are read through ESLint's `calculateConfigForFile()`: the project's ESLint
 * config as it is, and an Oxlint config once it is turned into a flat config
 * that holds only its Tasty part.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

const NAME = '@tenphi/eslint-plugin-tasty';

/** The names Oxlint gives the plugin when `jsPlugins` lists it without one. */
const OXLINT_NAMES = ['@tenphi/tasty', NAME];

/**
 * The files Oxlint 1.x finds by itself, in each folder from the file up, then
 * the JavaScript ones it reads only through `--config`.
 */
export const OXLINT_CONFIGS = [
  '.oxlintrc.json',
  '.oxlintrc.jsonc',
  'oxlint.config.ts',
  'oxlint.config.mts',
  'oxlint.config.js',
  'oxlint.config.mjs',
  'oxlint.config.cjs',
];

export const ESLINT_CONFIGS = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];

/** The files the tools lint, in an ESLint `files` pattern. */
export const SOURCES = '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}';

const LEVELS = {
  off: 'off',
  allow: 'off',
  0: 'off',
  warn: 'warn',
  1: 'warn',
  error: 'error',
  deny: 'error',
  2: 'error',
};

/** Whether a rule entry turns the rule on. */
export function isOn(entry) {
  return LEVELS[Array.isArray(entry) ? entry[0] : entry] !== 'off';
}

/**
 * JSON with comments and trailing commas, as Oxlint reads `.oxlintrc.json`.
 * Strings are copied as they are.
 */
export function parseJsonc(text) {
  const withoutComments = replaceOutsideStrings(
    text,
    /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y,
    ' ',
  );
  return JSON.parse(
    replaceOutsideStrings(withoutComments, /,(?=\s*[}\]])/y, ''),
  );
}

/** Replaces each match of the sticky `pattern` that starts outside a string. */
function replaceOutsideStrings(text, pattern, replacement) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      let end = i + 1;
      while (end < text.length && text[end] !== '"') {
        end += text[end] === '\\' ? 2 : 1;
      }
      out += text.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    pattern.lastIndex = i;
    const match = pattern.exec(text);
    if (match) {
      out += replacement;
      i += match[0].length;
    } else {
      out += text[i++];
    }
  }
  return out;
}

/** The package a bare specifier names, such as `@acme/kit` for `@acme/kit/lint`. */
export function packageOf(specifier) {
  if (specifier.startsWith('.') || isAbsolute(specifier)) return undefined;
  const parts = specifier.split('/');
  return parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
}

/**
 * The packages that may re-export this plugin: those of the bare
 * `importSources`, but Tasty itself.
 */
export function reexportingPackages(importSources) {
  const packages = new Set();
  for (const source of importSources ?? []) {
    const name = typeof source === 'string' ? packageOf(source) : undefined;
    if (name && name !== '@tenphi/tasty' && name !== NAME) packages.add(name);
  }
  return [...packages].sort();
}

/** Whether a config's text names this plugin or one of `packages`. */
export function namesPlugin(text, packages = []) {
  if (text.includes(NAME)) return true;
  return packages.some((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return new RegExp(`(['"\`])${escaped}(?:/[^'"\`]*)?\\1`).test(text);
  });
}

/** A module as `from` would import it, through jiti. */
async function importFrom(from, specifier) {
  // Loaded only when needed: the hook starts on every edit.
  const { createJiti } = await import('jiti');
  const jiti = createJiti(from, { moduleCache: false });
  const mod = await jiti.import(specifier);
  return mod?.default ?? mod;
}

const importConfig = (file) => importFrom(file, file);

async function readOxlintConfig(file) {
  return /\.jsonc?$/.test(file)
    ? parseJsonc(readFileSync(file, 'utf8'))
    : importConfig(file);
}

/** A config and the configs it extends, in the order Oxlint merges them. */
async function oxlintLayers(config, dir, seen = new Set()) {
  const layers = [];
  for (const base of config?.extends ?? []) {
    if (typeof base === 'string') {
      const file = resolve(dir, base);
      if (seen.has(file)) continue;
      seen.add(file);
      layers.push(
        ...(await oxlintLayers(
          await readOxlintConfig(file),
          dirname(file),
          seen,
        )),
      );
    } else if (base && typeof base === 'object') {
      layers.push(...(await oxlintLayers(base, dir, seen)));
    }
  }
  if (config && typeof config === 'object') layers.push(config);
  return layers;
}

/**
 * Whether a `jsPlugins` specifier of the config `file` loads this plugin: by
 * its name, by a path into this package, or as what a module of one of
 * `packages` exports.
 */
async function isThisPlugin(
  specifier,
  file,
  { plugin, packageRoot, packages },
) {
  if (specifier === NAME || specifier.startsWith(`${NAME}/`)) return true;
  const name = packageOf(specifier);
  if (!name) {
    try {
      return realpathSync(resolve(dirname(file), specifier)).startsWith(
        packageRoot + sep,
      );
    } catch {
      return false;
    }
  }
  if (!packages.includes(name)) return false;
  try {
    const loaded = await importFrom(file, specifier);
    return loaded === plugin || loaded?.meta?.name === NAME;
  } catch {
    return false;
  }
}

/** The names an Oxlint config's `jsPlugins` give this plugin. */
async function oxlintNames(layers, file, options) {
  const names = new Set();
  const entries = layers.flatMap((layer) => [
    ...(layer.jsPlugins ?? []),
    ...(layer.overrides ?? []).flatMap((o) => o?.jsPlugins ?? []),
  ]);
  for (const entry of entries) {
    const { name, specifier } =
      typeof entry === 'string' ? { specifier: entry } : (entry ?? {});
    if (
      typeof specifier !== 'string' ||
      !(await isThisPlugin(specifier, file, options))
    ) {
      continue;
    }
    for (const n of typeof name === 'string' ? [name] : OXLINT_NAMES) {
      names.add(n);
    }
  }
  return names;
}

/**
 * The rules of this plugin in a rule map, renamed to `tasty/<rule>`, with
 * Oxlint's levels (`allow`, `deny`) written as ESLint's.
 */
export function tastyRules(rules, names, known) {
  const out = {};
  for (const [key, entry] of Object.entries(rules ?? {})) {
    const slash = key.lastIndexOf('/');
    const rule = key.slice(slash + 1);
    if (slash < 0 || !names.has(key.slice(0, slash)) || !known.has(rule)) {
      continue;
    }
    const [level, ...options] = Array.isArray(entry) ? entry : [entry];
    const severity = LEVELS[level];
    if (severity) {
      out[`tasty/${rule}`] = options.length ? [severity, ...options] : severity;
    }
  }
  return out;
}

/** An Oxlint `files` pattern for ESLint: one without a slash matches at any depth. */
export function fileGlob(pattern) {
  const glob = pattern.replace(/^\.\//, '');
  return glob.includes('/') ? glob : `**/${glob}`;
}

/** An Oxlint `ignorePatterns` entry, which follows `.gitignore`, for ESLint. */
export function ignoreGlobs(pattern) {
  const negated = pattern.startsWith('!');
  let glob = negated ? pattern.slice(1) : pattern;
  const folder = glob.endsWith('/');
  if (folder) glob = glob.slice(0, -1);
  if (glob.startsWith('/')) glob = glob.slice(1);
  else if (!glob.includes('/')) glob = `**/${glob}`;
  return (folder ? [`${glob}/**`] : [glob, `${glob}/**`]).map((g) =>
    negated ? `!${g}` : g,
  );
}

/**
 * The flat config that holds the Tasty part of an Oxlint config: its rules,
 * the overrides that change them, `settings.tasty` and `ignorePatterns`.
 * Undefined when the config does not load the plugin.
 */
export async function oxlintFlatConfig(
  file,
  { plugin, packageRoot, packages = [] },
) {
  const layers = await oxlintLayers(
    await readOxlintConfig(file),
    dirname(file),
    new Set([file]),
  );
  const names = await oxlintNames(layers, file, {
    plugin,
    packageRoot,
    packages,
  });
  if (names.size === 0) return undefined;
  const known = new Set(Object.keys(plugin.rules));
  const settings = Object.assign(
    {},
    ...layers.map((layer) => layer.settings?.tasty),
  );
  const ignores = layers
    .flatMap((layer) => layer.ignorePatterns ?? [])
    .flatMap(ignoreGlobs);
  const overrides = layers.flatMap((layer) => layer.overrides ?? []);
  return [
    {
      files: [SOURCES],
      plugins: { tasty: plugin },
      settings: { tasty: settings },
    },
    ...(ignores.length > 0 ? [{ ignores }] : []),
    ...layers.map((layer) => ({
      rules: tastyRules(layer.rules, names, known),
    })),
    ...overrides.map((override) => ({
      files: (override.files ?? []).map(fileGlob),
      ...(override.excludeFiles
        ? { ignores: override.excludeFiles.map(fileGlob) }
        : {}),
      rules: tastyRules(override.rules, names, known),
    })),
  ];
}

/**
 * Finds and reads the project's Tasty lint config for each file.
 *
 * `forFile(file)` gives `{ source, rules, settings }`: `source` is the config
 * (`{ linter, file, dir }`), or null when no config above the file loads the
 * plugin, and then `rules` is null too, and `unused` is the nearest lint config
 * above the file, if any. `ignored` is true when the config does not lint the
 * file.
 *
 * With `loadConfig` (the plugin's), a config also loads the plugin through the
 * packages of the `importSources` of the file's `tasty.config.*`.
 */
export function createConfigResolver({
  ESLint,
  plugin,
  packageRoot,
  loadConfig,
}) {
  const known = new Set(Object.keys(plugin.rules));
  const byDir = new Map();

  function packagesFor(file) {
    try {
      return loadConfig
        ? reexportingPackages(loadConfig(file).importSources)
        : [];
    } catch {
      // A broken tasty.config.* is reported when the rules run.
      return [];
    }
  }

  async function sourceIn(dir, packages) {
    let unused;
    for (const oxlint of OXLINT_CONFIGS.map((n) => join(dir, n))) {
      if (!existsSync(oxlint)) continue;
      const config = await oxlintFlatConfig(oxlint, {
        plugin,
        packageRoot,
        packages,
      });
      if (config) {
        return {
          linter: 'oxlint',
          file: oxlint,
          dir,
          eslint: new ESLint({
            cwd: dir,
            overrideConfigFile: true,
            overrideConfig: config,
          }),
        };
      }
      unused ??= oxlint;
    }
    // A text test first: loading an ESLint config loads every plugin it uses.
    const eslint = ESLINT_CONFIGS.map((n) => join(dir, n)).find(existsSync);
    if (eslint && namesPlugin(readFileSync(eslint, 'utf8'), packages)) {
      return {
        linter: 'eslint',
        file: eslint,
        dir,
        eslint: new ESLint({ cwd: dir, overrideConfigFile: eslint }),
      };
    }
    unused ??= eslint;
    const parent = dirname(dir);
    const above = parent === dir ? null : await sourceFor(parent, packages);
    return above?.linter ? above : { unused: unused ?? above?.unused };
  }

  function sourceFor(dir, packages) {
    const key = `${dir}\0${packages.join(',')}`;
    if (!byDir.has(key)) byDir.set(key, sourceIn(dir, packages));
    return byDir.get(key);
  }

  return {
    async forFile(file) {
      const found = await sourceFor(dirname(file), packagesFor(file));
      if (!found.linter) {
        return {
          source: null,
          rules: null,
          settings: {},
          ...(found.unused ? { unused: found.unused } : {}),
        };
      }
      const source = found;
      const config = await source.eslint.calculateConfigForFile(file);
      if (!config) return { source, ignored: true, rules: {}, settings: {} };
      const names = new Set(
        Object.entries(config.plugins ?? {})
          .filter(([, p]) => p === plugin || p?.meta?.name === NAME)
          .map(([name]) => name),
      );
      return {
        source,
        rules: tastyRules(config.rules, names, known),
        settings: { ...config.settings?.tasty },
      };
    },
  };
}
