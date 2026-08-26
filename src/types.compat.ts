import type { ResolvedConfig } from './types.js';

/**
 * Compile-time guards for the published config types. Types only — this module is
 * imported by nothing, so it is typechecked and never bundled.
 */

type Assert<T extends true> = T;

/**
 * The `ResolvedConfig` shape as of 1.0. A consumer that builds one of these — to
 * hand to `TastyContext`, say — must keep compiling, so every key added after 1.0
 * has to be optional. Make one required and this assertion fails.
 */
interface ResolvedConfigAt1_0 {
  tokens: false | string[];
  units: false | string[];
  functions: false | string[];
  states: string[];
  presets: string[];
  recipes: string[];
  styles: string[];
  importSources: string[];
}

export type ResolvedConfigStaysAssignable = Assert<
  ResolvedConfigAt1_0 extends ResolvedConfig ? true : false
>;
