/**
 * The project's own Tasty lint config, so the tools report what the project's
 * lint reports: the level and options of each tasty/* rule, `settings.tasty`,
 * and the files the config ignores. It comes from the nearest Oxlint or ESLint
 * config above a file that loads this plugin.
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

/** The files Oxlint 1.x finds by itself, in each folder from the file up. */
export const OXLINT_CONFIGS = [
  '.oxlintrc.json',
  '.oxlintrc.jsonc',
  'oxlint.config.ts',
  'oxlint.config.mts',
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

async function importConfig(file) {
  // Loaded only for a TypeScript config: the hook starts on every edit.
  const { createJiti } = await import('jiti');
  const jiti = createJiti(file, { moduleCache: false });
  const mod = await jiti.import(file);
  return mod?.default ?? mod;
}

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

/** Whether a `jsPlugins` specifier loads this package. */
function isThisPlugin(specifier, dir, packageRoot) {
  if (specifier === NAME || specifier.startsWith(`${NAME}/`)) return true;
  if (!specifier.startsWith('.') && !isAbsolute(specifier)) return false;
  try {
    return realpathSync(resolve(dir, specifier)).startsWith(packageRoot + sep);
  } catch {
    return false;
  }
}

/** The names an Oxlint config's `jsPlugins` give this plugin. */
function oxlintNames(layers, dir, packageRoot) {
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
      !isThisPlugin(specifier, dir, packageRoot)
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
export async function oxlintFlatConfig(file, { plugin, packageRoot }) {
  const dir = dirname(file);
  const layers = await oxlintLayers(
    await readOxlintConfig(file),
    dir,
    new Set([file]),
  );
  const names = oxlintNames(layers, dir, packageRoot);
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
 * plugin, and then `rules` is null too. `ignored` is true when the config does
 * not lint the file.
 */
export function createConfigResolver({ ESLint, plugin, packageRoot }) {
  const known = new Set(Object.keys(plugin.rules));
  const byDir = new Map();

  async function sourceIn(dir) {
    const oxlint = OXLINT_CONFIGS.map((n) => join(dir, n)).find(existsSync);
    if (oxlint) {
      const config = await oxlintFlatConfig(oxlint, { plugin, packageRoot });
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
    }
    // A text test first: loading an ESLint config loads every plugin it uses.
    const eslint = ESLINT_CONFIGS.map((n) => join(dir, n)).find(existsSync);
    if (eslint && readFileSync(eslint, 'utf8').includes(NAME)) {
      return {
        linter: 'eslint',
        file: eslint,
        dir,
        eslint: new ESLint({ cwd: dir, overrideConfigFile: eslint }),
      };
    }
    const parent = dirname(dir);
    return parent === dir ? null : sourceFor(parent);
  }

  function sourceFor(dir) {
    if (!byDir.has(dir)) byDir.set(dir, sourceIn(dir));
    return byDir.get(dir);
  }

  return {
    async forFile(file) {
      const source = await sourceFor(dirname(file));
      if (!source) return { source: null, rules: null, settings: {} };
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
