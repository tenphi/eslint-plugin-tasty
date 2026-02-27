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

function findConfigFile(projectRoot: string): string | null {
  for (const name of CONFIG_FILENAMES) {
    const path = join(projectRoot, name);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

function loadRawConfig(configPath: string): TastyValidationConfig {
  const content = readFileSync(configPath, 'utf-8');

  if (configPath.endsWith('.json')) {
    return JSON.parse(content) as TastyValidationConfig;
  }

  // For TS/JS files, extract JSON-like config or use a simple parser.
  // In a real implementation, we'd use jiti or tsx to load TS configs.
  // For now, attempt JSON parse of the default export pattern.
  const jsonMatch = content.match(
    /export\s+default\s+({[\s\S]*?})\s*(?:;|\n|$)/,
  );
  if (jsonMatch) {
    try {
      const fn = new Function(`return (${jsonMatch[1]})`);
      return fn() as TastyValidationConfig;
    } catch {
      // fall through
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
    try {
      parentPath = require.resolve(config.extends);
    } catch {
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
