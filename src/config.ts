import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

import { createJiti } from 'jiti';
import semver from 'semver';

import type { ResolvedConfig, TastyValidationConfig } from './types.js';
import { DEFAULT_IMPORT_SOURCES } from './constants.js';
import { version as pluginVersion } from './version.js';

const CONFIG_FILENAMES = [
  'tasty.config.ts',
  'tasty.config.js',
  'tasty.config.mjs',
  'tasty.config.json',
];

interface CachedConfig {
  /** The resolved config, or the error that loading it failed with. */
  result: ResolvedConfig | Error;
  fileMtimes: Map<string, number>;
}

const configCache = new Map<string, CachedConfig>();

/**
 * Every key a config may carry; anything else is a typo or from a newer plugin.
 * Typed against the config interface so a new key cannot be missed here.
 */
const KNOWN_KEYS = new Set(
  Object.keys({
    extends: true,
    requires: true,
    tokens: true,
    units: true,
    functions: true,
    funcs: true,
    states: true,
    presets: true,
    recipes: true,
    styles: true,
    importSources: true,
    ownedSources: true,
    styleFunctions: true,
    protectedComponents: true,
    // The Tasty VS Code extension reads these from the same file.
    presetDescriptions: true,
    stateDescriptions: true,
  } satisfies Record<keyof TastyValidationConfig, true>),
);

const warnings = new Set<string>();

/** A config problem worth a message but not a failed run, said once per process. */
function warnOnce(message: string): void {
  if (warnings.has(message)) return;
  warnings.add(message);
  console.warn(`[eslint-plugin-tasty] ${message}`);
}

/** Fails the run when the installed plugin is outside the config's `requires`. */
function checkRequires(config: TastyValidationConfig, configPath: string) {
  const range: unknown = config.requires;
  if (range === undefined) return;
  if (
    typeof range !== 'string' ||
    range.trim() === '' ||
    semver.validRange(range) === null
  ) {
    throw new Error(
      `tasty: ${configPath}: 'requires' must be a semver range of @tenphi/eslint-plugin-tasty versions, such as '>=1.13.0'.`,
    );
  }
  // A snapshot of the next release still satisfies `>=` the current one.
  if (!semver.satisfies(pluginVersion, range, { includePrerelease: true })) {
    throw new Error(
      `tasty: ${configPath} requires @tenphi/eslint-plugin-tasty ${range}, but ${pluginVersion} is installed. Upgrade the plugin.`,
    );
  }
}

/** List keys, and whether `false` (turning the check off) is allowed. */
const LIST_KEYS = {
  tokens: true,
  units: true,
  functions: true,
  funcs: true,
  states: false,
  presets: false,
  recipes: false,
  styles: false,
  importSources: false,
  ownedSources: false,
} as const;

/** Keys Tasty's runtime config (`configure()`) holds as objects keyed by name. */
const RUNTIME_OBJECT_KEYS = [
  'tokens',
  'units',
  'functions',
  'states',
  'presets',
  'recipes',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string')
      ? 'a list'
      : 'a list with a non-string entry';
  }
  return isPlainObject(value) ? 'an object' : `a ${typeof value}`;
}

/**
 * Warns about keys the plugin does not read and known keys of the wrong shape,
 * and returns the config without the latter, so `states: '@mobile'` is not
 * read character by character.
 */
function checkKeys(
  config: TastyValidationConfig,
  configPath: string,
): TastyValidationConfig {
  // Tasty's SSR guide keeps the runtime config in a `tasty.config.ts` too.
  const runtime = RUNTIME_OBJECT_KEYS.some((key) =>
    isPlainObject((config as Record<string, unknown>)[key]),
  )
    ? " It looks like Tasty's runtime config, which the plugin does not read."
    : '';

  const unknown = Object.keys(config).filter(
    (key) => !KNOWN_KEYS.has(key) && key !== '__esModule',
  );
  if (unknown.length > 0) {
    const keys = unknown.map((key) => `'${key}'`).join(', ');
    warnOnce(
      `${configPath}: ignoring unknown ${unknown.length === 1 ? 'key' : 'keys'} ${keys}.${
        runtime ||
        ` Check the spelling, or upgrade @tenphi/eslint-plugin-tasty (${pluginVersion} is installed) if the config was written for a newer version.`
      }`,
    );
  }

  const checked: Record<string, unknown> = { ...config };
  const ignore = (key: string, expected: string) => {
    warnOnce(
      `${configPath}: ignoring '${key}', which must be ${expected}, not ${describe(checked[key])}.${runtime}`,
    );
    delete checked[key];
  };
  for (const [key, allowsFalse] of Object.entries(LIST_KEYS)) {
    const value = checked[key];
    if (
      value === undefined ||
      (value === false && allowsFalse) ||
      (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    ) {
      continue;
    }
    ignore(key, `${allowsFalse ? 'false or ' : ''}a list of names`);
  }
  if (
    checked.styleFunctions !== undefined &&
    !isPlainObject(checked.styleFunctions)
  ) {
    ignore('styleFunctions', 'an object keyed by function name');
  }
  return checked as TastyValidationConfig;
}

function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

function resolvePackageDir(
  packageName: string,
  startDir: string,
): string | null {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    const candidate = join(dir, 'node_modules', ...packageName.split('/'));
    if (existsSync(candidate) && existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
    dir = dirname(dir);
  }
  return null;
}

function findConfigInDir(dir: string): string | null {
  for (const name of CONFIG_FILENAMES) {
    const path = join(dir, name);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

function collectConfigFiles(startDir: string, projectRoot: string): string[] {
  const configs: string[] = [];
  let dir = startDir;
  const root = resolve(projectRoot);

  while (true) {
    const found = findConfigInDir(dir);
    if (found) configs.push(found);
    if (resolve(dir) === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return configs;
}

const TASTY_PACKAGE_NAME = '@tenphi/tasty';

function stripComments(source: string): string {
  let result = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      result += ch;
      i++;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\') {
          result += source[i++];
        }
        if (i < source.length) {
          result += source[i++];
        }
      }
      if (i < source.length) {
        result += source[i++];
      }
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (
        i < source.length &&
        !(source[i] === '*' && source[i + 1] === '/')
      ) {
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        i++;
      }
      continue;
    }
    result += source[i++];
  }
  return result;
}

function stripImports(source: string): string {
  return source.replace(/^\s*import\s+.*?;\s*$/gm, '');
}

function extractBalancedBraces(content: string, start: number): string | null {
  if (content[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i++;
      while (i < content.length && content[i] !== ch) {
        if (content[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) return content.slice(start, i + 1);
  }
  return null;
}

function extractImportPaths(configPath: string): string[] {
  const source = readFileSync(configPath, 'utf-8');
  const configDir = dirname(configPath);
  const paths: string[] = [];
  const re = /^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm;
  let m;

  while ((m = re.exec(source)) !== null) {
    const specifier = m[1];

    if (!specifier.startsWith('.')) continue;

    const abs = resolve(configDir, specifier);

    for (const ext of ['', '.ts', '.js', '.mjs', '.tsx', '.jsx']) {
      const candidate = abs + ext;

      if (existsSync(candidate)) {
        paths.push(candidate);
        break;
      }
    }
  }

  return paths;
}

function stripTypeScriptSyntax(source: string): string {
  return source
    .replace(/\bas\s+const\b/g, '')
    .replace(/\bsatisfies\s+[A-Z]\w*(?:<[^>]*>)?/g, '')
    .replace(/\bas\s+[A-Z]\w*(?:<[^>]*>)?/g, '');
}

function loadRawConfig(configPath: string): TastyValidationConfig {
  if (configPath.endsWith('.json')) {
    return JSON.parse(
      readFileSync(configPath, 'utf-8'),
    ) as TastyValidationConfig;
  }

  // Try jiti first — it resolves imports and TypeScript natively.
  try {
    const jiti = createJiti(dirname(configPath), { moduleCache: false });
    const mod = jiti(configPath) as Record<string, unknown>;
    const config = (mod.default ?? mod) as TastyValidationConfig;

    if (config && typeof config === 'object') {
      return config;
    }
  } catch {
    // Fall through to text-based parsing.
  }

  // Fallback: text-based extraction (no import support).
  const content = readFileSync(configPath, 'utf-8');
  const stripped = stripImports(stripComments(content));
  const match = stripped.match(/export\s+default\s+/);

  if (match && match.index != null) {
    const braceStart = match.index + match[0].length;
    const objectStr = extractBalancedBraces(stripped, braceStart);

    if (objectStr) {
      const cleaned = stripTypeScriptSyntax(objectStr);

      try {
        const fn = new Function(`return (${cleaned})`);
        return fn() as TastyValidationConfig;
      } catch (err) {
        console.warn(
          `[eslint-plugin-tasty] Failed to parse config file ${configPath}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  return {};
}

function mergeConfigs(
  parent: TastyValidationConfig,
  child: TastyValidationConfig,
): TastyValidationConfig {
  const result: TastyValidationConfig = { ...parent };

  const arrayKeys = [
    ...(Object.keys(LIST_KEYS) as (keyof typeof LIST_KEYS)[]),
    'protectedComponents',
  ] as const;

  for (const key of arrayKeys) {
    const childVal = child[key];
    if (childVal === undefined) continue;

    if (childVal === false) {
      (result as Record<string, unknown>)[key] = false;
      continue;
    }

    const parentVal = parent[key];
    if (Array.isArray(parentVal) && Array.isArray(childVal)) {
      (result as Record<string, unknown>)[key] = [
        ...new Set([...parentVal, ...childVal]),
      ];
    } else {
      (result as Record<string, unknown>)[key] = childVal;
    }
  }

  if (child.styleFunctions !== undefined) {
    result.styleFunctions = {
      ...parent.styleFunctions,
      ...child.styleFunctions,
    };
  }

  return result;
}

/**
 * The config file `extends` points to, or null when there is none. A relative
 * or absolute path that is not a file fails the run, as reading it always has; a
 * value that names nothing usable is skipped with a warning.
 */
function resolveExtends(
  config: TastyValidationConfig,
  configPath: string,
  touched: string[],
): string | null {
  const target: unknown = config.extends;
  if (target === undefined) return null;
  const configDir = dirname(configPath);
  if (typeof target !== 'string' || target === '') {
    warnOnce(
      `${configPath}: 'extends' must be a config path or a package name, not ${JSON.stringify(target)}. It is ignored.`,
    );
    return null;
  }

  if (target.startsWith('.') || target.startsWith('/')) {
    const parentPath = resolve(configDir, target);
    // Watched, so creating the file clears a cached failure.
    touched.push(parentPath);
    if (!isFile(parentPath)) {
      throw new Error(
        `tasty: ${configPath}: 'extends' points to ${parentPath}, which is not a file.`,
      );
    }
    return parentPath;
  }

  // `@scope/pkg/path/to/config` names a file inside the package.
  const parts = target.split('/');
  const packageName = parts.slice(0, target.startsWith('@') ? 2 : 1).join('/');
  const subpath = target.slice(packageName.length + 1);
  const pkgDir = resolvePackageDir(packageName, configDir);
  if (!pkgDir) {
    warnOnce(
      `${configPath}: 'extends' names '${packageName}', which cannot be resolved from ${configDir}. It is ignored.`,
    );
    return null;
  }
  const pkgConfig = subpath
    ? findConfigFile(join(pkgDir, subpath))
    : findConfigInDir(pkgDir);
  if (!pkgConfig) {
    warnOnce(
      subpath
        ? `${configPath}: 'extends' names '${target}', but ${join(pkgDir, subpath)} is not a config file. It is ignored.`
        : `${configPath}: 'extends' names '${target}', which has no tasty.config.* at ${pkgDir}. It is ignored.`,
    );
  }
  return pkgConfig;
}

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

/** A config file at `path`, with or without its extension, or in that directory. */
function findConfigFile(path: string): string | null {
  for (const ext of ['', '.ts', '.js', '.mjs', '.json']) {
    if (isFile(path + ext)) return path + ext;
  }
  return statSync(path, { throwIfNoEntry: false })?.isDirectory()
    ? findConfigInDir(path)
    : null;
}

/**
 * Loads a config and the chain it extends, parents merged first. Every file
 * read (or expected) is pushed to `touched`, whose mtimes decide when the
 * result, or a failure, is stale.
 */
function resolveConfigChain(
  configPath: string,
  touched: string[],
  visited = new Set<string>(),
): TastyValidationConfig {
  const absPath = resolve(configPath);
  if (visited.has(absPath)) {
    warnOnce(
      `${absPath} is extended again by its own extends chain. The cycle is ignored.`,
    );
    return {};
  }
  visited.add(absPath);
  touched.push(absPath);

  let config = loadRawConfig(absPath);
  touched.push(...extractImportPaths(absPath));

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    warnOnce(`${absPath}: the config must be an object. It is ignored.`);
    config = {};
  }
  checkRequires(config, absPath);
  config = checkKeys(config, absPath);

  const parentPath = resolveExtends(config, absPath, touched);
  if (!parentPath) return config;

  return mergeConfigs(resolveConfigChain(parentPath, touched, visited), config);
}

function toResolved(config: TastyValidationConfig): ResolvedConfig {
  return {
    tokens: config.tokens ?? [],
    units: config.units ?? [],
    // `funcs` is the v2 spelling; `functions` wins when both are present.
    functions: config.functions ?? config.funcs ?? [],
    states: config.states ?? [],
    presets: config.presets ?? [],
    recipes: config.recipes ?? [],
    styles: config.styles ?? [],
    importSources: config.importSources ?? DEFAULT_IMPORT_SOURCES,
    ownedSources: config.ownedSources ?? [],
    styleFunctions: config.styleFunctions ?? {},
    protectedComponents: config.protectedComponents || [],
  };
}

const DEFAULT_CONFIG: ResolvedConfig = {
  tokens: [],
  units: [],
  functions: [],
  states: [],
  presets: [],
  recipes: [],
  styles: [],
  importSources: DEFAULT_IMPORT_SOURCES,
  ownedSources: [],
  styleFunctions: {},
  protectedComponents: [],
};

function getMtimes(paths: string[]): Map<string, number> {
  const mtimes = new Map<string, number>();
  for (const p of paths) {
    try {
      mtimes.set(p, statSync(p).mtimeMs);
    } catch {
      mtimes.set(p, -1);
    }
  }
  return mtimes;
}

function mtimesMatch(
  cached: Map<string, number>,
  current: Map<string, number>,
): boolean {
  if (cached.size !== current.size) return false;
  for (const [path, mtime] of cached) {
    if (current.get(path) !== mtime) return false;
  }
  return true;
}

export function loadConfig(filePath: string): ResolvedConfig {
  const fileDir = dirname(resolve(filePath));
  const projectRoot = findProjectRoot(fileDir);
  if (!projectRoot) return DEFAULT_CONFIG;

  const configFiles = collectConfigFiles(fileDir, projectRoot);

  const pkgDir = resolvePackageDir(TASTY_PACKAGE_NAME, projectRoot);
  const pkgConfigFile = pkgDir ? findConfigInDir(pkgDir) : null;

  if (configFiles.length === 0 && !pkgConfigFile) return DEFAULT_CONFIG;

  const cacheKey = [pkgConfigFile ?? '', ...configFiles].join('\0');

  const cached = configCache.get(cacheKey);
  if (
    cached &&
    mtimesMatch(cached.fileMtimes, getMtimes([...cached.fileMtimes.keys()]))
  ) {
    if (cached.result instanceof Error) throw cached.result;
    return cached.result;
  }

  // A failure is cached too: oxlint keeps linting after a plugin error, and
  // every rule on every file would otherwise reload the chain to fail again.
  const touched: string[] = [];
  let result: ResolvedConfig | Error;
  try {
    let merged: TastyValidationConfig = pkgConfigFile
      ? resolveConfigChain(pkgConfigFile, touched)
      : {};
    for (let i = configFiles.length - 1; i >= 0; i--) {
      merged = mergeConfigs(
        merged,
        resolveConfigChain(configFiles[i], touched),
      );
    }
    result = toResolved(merged);
  } catch (error) {
    result = error instanceof Error ? error : new Error(String(error));
  }

  configCache.set(cacheKey, { result, fileMtimes: getMtimes(touched) });
  if (result instanceof Error) throw result;
  return result;
}
