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
}
