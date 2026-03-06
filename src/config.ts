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
  mtimes: Map<string, number>;
}

let cachedConfig: CachedConfig | null = null;

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
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function extractBalancedBraces(content: string, start: number): string | null {
  if (content[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    if (depth === 0) return content.slice(start, i + 1);
  }
  return null;
}

function loadRawConfig(configPath: string): TastyValidationConfig {
  const content = readFileSync(configPath, 'utf-8');

  if (configPath.endsWith('.json')) {
    return JSON.parse(content) as TastyValidationConfig;
  }

  const stripped = stripComments(content);
  const match = stripped.match(/export\s+default\s+/);
  if (match && match.index != null) {
    const braceStart = match.index + match[0].length;
    const objectStr = extractBalancedBraces(stripped, braceStart);
    if (objectStr) {
      try {
        const fn = new Function(`return (${objectStr})`);
        return fn() as TastyValidationConfig;
      } catch {
        // fall through
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

function resolveConfigChain(
  configPath: string,
  visited = new Set<string>(),
): TastyValidationConfig {
  const absPath = resolve(configPath);
  if (visited.has(absPath)) return {};
  visited.add(absPath);

  const config = loadRawConfig(absPath);

  if (!config.extends) return config;

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
        return config;
      }
    } else {
      return config;
    }
  }

  const parentConfig = resolveConfigChain(parentPath, visited);
  return mergeConfigs(parentConfig, config);
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

export function loadConfig(filePath: string): ResolvedConfig {
  const projectRoot = findProjectRoot(dirname(resolve(filePath)));
  if (!projectRoot) return DEFAULT_CONFIG;

  const configFile = findConfigFile(projectRoot);
  if (!configFile) return DEFAULT_CONFIG;

  const currentMtime = statSync(configFile).mtimeMs;

  if (cachedConfig) {
    const cachedMtime = cachedConfig.mtimes.get(configFile);
    if (cachedMtime === currentMtime) {
      return cachedConfig.config;
    }
  }

  const rawConfig = resolveConfigChain(configFile);
  const resolved = toResolved(rawConfig);

  cachedConfig = {
    config: resolved,
    mtimes: new Map([[configFile, currentMtime]]),
  };

  return resolved;
}
