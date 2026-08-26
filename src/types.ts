export interface TastyValidationConfig {
  extends?: string;
  tokens?: false | string[];
  units?: false | string[];
  /**
   * Valid custom parse-function names. Matches Tasty v3's `functions` config key.
   *
   * `funcs` is the v2 spelling and is still read as a deprecated alias so a shared
   * `tasty.config.ts` keeps working through the upgrade.
   */
  functions?: false | string[];
  /** @deprecated Renamed to `functions` in Tasty v3. */
  funcs?: false | string[];
  states?: string[];
  presets?: string[];
  recipes?: string[];
  styles?: string[];
  importSources?: string[];
  /**
   * Import sources whose components this project can edit — a design system
   * published from the same monorepo, for instance. Rules that would send the
   * author to a base component's own definition stay quiet when the base comes
   * from somewhere else, since that file is not theirs to change.
   *
   * Relative, absolute, `~`, `#` and `@/` specifiers, plus components declared
   * in the same file, count as owned without being listed. `*` matches any run
   * of characters, so `@my-org/*` covers every package under the scope.
   */
  ownedSources?: string[];
}

export interface ResolvedConfig {
  tokens: false | string[];
  units: false | string[];
  functions: false | string[];
  states: string[];
  presets: string[];
  recipes: string[];
  styles: string[];
  importSources: string[];
  /**
   * Optional, unlike every key above it, and deliberately so: `ResolvedConfig` is
   * part of the published surface, and a consumer's existing object literal must
   * keep compiling when the plugin learns a new key. `loadConfig` always fills
   * this in, so plugin code can read it directly; anything else should treat a
   * missing value as the empty list. See `types.compat.ts` for the guard.
   */
  ownedSources?: string[];
}
