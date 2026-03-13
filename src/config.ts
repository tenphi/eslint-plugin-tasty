import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type { ResolvedConfig, TastyValidationConfig } from './types.js';
import { DEFAULT_IMPORT_SOURCES } from './constants.js';

const CONFIG_FILENAMES = [
  'tasty.config.ts',
  'tasty.config.js',
  'tasty.config.mjs',
  'tasty.config.json',
];

interface CachedConfig {
  config: ResolvedConfig;
  fileMtimes: Map<string, number>;
}

const configCache = new Map<string, CachedConfig>();

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

function findConfigFile(projectRoot: string): string | null {
  for (const name of CONFIG_FILENAMES) {
    const path = join(projectRoot, name);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

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
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
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

function stripTypeScriptSyntax(source: string): string {
  return source
    .replace(/\bas\s+const\b/g, '')
    .replace(/\bsatisfies\s+[A-Z]\w*(?:<[^>]*>)?/g, '')
    .replace(/\bas\s+[A-Z]\w*(?:<[^>]*>)?/g, '');
}

function loadRawConfig(configPath: string): TastyValidationConfig {
  const content = readFileSync(configPath, 'utf-8');

  if (configPath.endsWith('.json')) {
    return JSON.parse(content) as TastyValidationConfig;
  }

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
    'tokens',
    'units',
    'funcs',
    'states',
    'presets',
    'recipes',
    'styles',
    'importSources',
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

  return result;
}

interface ConfigChainResult {
  config: TastyValidationConfig;
  chainPaths: string[];
}

function resolveConfigChain(
  configPath: string,
  visited = new Set<string>(),
): ConfigChainResult {
  const absPath = resolve(configPath);
  if (visited.has(absPath)) return { config: {}, chainPaths: [] };
  visited.add(absPath);

  const config = loadRawConfig(absPath);
  const chainPaths = [absPath];

  if (!config.extends) return { config, chainPaths };

  let parentPath: string;
  if (config.extends.startsWith('.') || config.extends.startsWith('/')) {
    parentPath = resolve(dirname(absPath), config.extends);
  } else {
    const pkgDir = resolvePackageDir(config.extends, dirname(absPath));
    if (pkgDir) {
      const pkgConfig = findConfigFile(pkgDir);
      if (pkgConfig) {
        parentPath = pkgConfig;
      } else {
        return { config, chainPaths };
      }
    } else {
      return { config, chainPaths };
    }
  }

  const parentResult = resolveConfigChain(parentPath, visited);
  return {
    config: mergeConfigs(parentResult.config, config),
    chainPaths: [...parentResult.chainPaths, ...chainPaths],
  };
}

function toResolved(config: TastyValidationConfig): ResolvedConfig {
  return {
    tokens: config.tokens ?? [],
    units: config.units ?? [],
    funcs: config.funcs ?? [],
    states: config.states ?? [],
    presets: config.presets ?? [],
    recipes: config.recipes ?? [],
    styles: config.styles ?? [],
    importSources: config.importSources ?? DEFAULT_IMPORT_SOURCES,
  };
}

const DEFAULT_CONFIG: ResolvedConfig = {
  tokens: [],
  units: [],
  funcs: [],
  states: [],
  presets: [],
  recipes: [],
  styles: [],
  importSources: DEFAULT_IMPORT_SOURCES,
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
  const projectRoot = findProjectRoot(dirname(resolve(filePath)));
  if (!projectRoot) return DEFAULT_CONFIG;

  const configFile = findConfigFile(projectRoot);
  if (!configFile) return DEFAULT_CONFIG;

  const cached = configCache.get(configFile);
  if (cached) {
    const currentMtimes = getMtimes([...cached.fileMtimes.keys()]);
    if (mtimesMatch(cached.fileMtimes, currentMtimes)) {
      return cached.config;
    }
  }

  const { config: rawConfig, chainPaths } = resolveConfigChain(configFile);
  const resolved = toResolved(rawConfig);
  const fileMtimes = getMtimes(chainPaths);

  configCache.set(configFile, { config: resolved, fileMtimes });

  return resolved;
}
