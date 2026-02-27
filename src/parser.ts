import { StyleParser } from '@tenphi/tasty/parser';
import type { ParserOptions } from '@tenphi/tasty/parser';
import type { ResolvedConfig } from './types.js';
import { BUILT_IN_UNITS } from './constants.js';

const BUILT_IN_UNIT_STUBS: Record<string, string> = {
  x: 'var(--gap)',
  r: 'var(--radius)',
  cr: 'var(--card-radius)',
  bw: 'var(--border-width)',
  ow: 'var(--outline-width)',
  fs: 'var(--font-size)',
  lh: 'var(--line-height)',
  sf: 'var(--scale-factor)',
};

let cachedParser: { parser: StyleParser; configKey: string } | null = null;

function configKey(config: ResolvedConfig): string {
  const units = config.units === false ? 'false' : JSON.stringify(config.units);
  const funcs = config.funcs === false ? 'false' : JSON.stringify(config.funcs);
  return `${units}|${funcs}`;
}

/**
 * Build a StyleParser from the ESLint plugin config.
 * Unit handlers are stubs (they produce placeholder CSS) because we only
 * care about bucket classification, not actual CSS output.
 */
export function getParser(config: ResolvedConfig): StyleParser {
  const key = configKey(config);
  if (cachedParser && cachedParser.configKey === key) {
    return cachedParser.parser;
  }

  const units: Record<string, string> = { ...BUILT_IN_UNIT_STUBS };

  if (Array.isArray(config.units)) {
    for (const u of config.units) {
      if (!units[u]) {
        units[u] = `var(--${u})`;
      }
    }
  } else if (config.units !== false) {
    for (const u of BUILT_IN_UNITS) {
      units[u] = BUILT_IN_UNIT_STUBS[u] ?? `var(--${u})`;
    }
  }

  const funcs: ParserOptions['funcs'] = {};
  if (Array.isArray(config.funcs)) {
    for (const f of config.funcs) {
      funcs[f] = (groups) => groups.map((g) => g.output).join(', ');
    }
  }

  const opts: ParserOptions = {
    units: config.units === false ? undefined : units,
    funcs: Object.keys(funcs).length > 0 ? funcs : undefined,
  };

  const parser = new StyleParser(opts);

  cachedParser = { parser, configKey: key };
  return parser;
}
