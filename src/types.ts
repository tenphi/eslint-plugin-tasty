/** A named import whose arguments contain Tasty styles. */
export interface StyleFunctionConfig {
  /** Zero-based argument index, or every argument for a variadic style helper. */
  argument: number | 'all';
  /** A style object, or Tasty options containing `styles` and `variants`. */
  kind: 'styles' | 'options';
  /** Treat styles as a partial override of existing styles. Defaults to false. */
  partial?: boolean;
}

/** Design-system components whose look is a contract, for `no-protected-restyle`. */
export interface ProtectedComponentConfig {
  /** Package the components are imported from. `*` matches any run of characters. */
  source: string;
  /**
   * Exported names to protect, `*` matching any run of characters. Defaults to
   * every export. A name with a dot is a member path, such as `Button.Split` or
   * `Menu.*`, and wins over an entry that matches only the export.
   */
  include?: string[];
  /**
   * Exported names or member paths to leave out, such as layout and typography
   * primitives, or a separate component attached as `Button.Group`.
   */
  exclude?: string[];
  /**
   * Style props that place or size the root and stay allowed: `'position'` and
   * `'dimension'` stand for Tasty's `POSITION_STYLES` and `DIMENSION_STYLES`,
   * anything else is a property name.
   */
  allowedStyleProps?: string[];
}

export interface TastyValidationConfig {
  extends?: string;
  /**
   * The `@tenphi/eslint-plugin-tasty` versions this config needs, as a semver
   * range such as `'>=1.13.0'`. Every config in the `extends` chain may declare
   * one, and linting fails when the installed plugin does not satisfy them all.
   */
  requires?: string;
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
  /** Custom calls, keyed by exported name, from tracked `importSources`. */
  styleFunctions?: Record<string, StyleFunctionConfig>;
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
  /**
   * Components a consumer should customize through their props rather than
   * restyle. Entries from an extended config come first; `false` drops them.
   */
  protectedComponents?: false | ProtectedComponentConfig[];
  /** Read by the Tasty VS Code extension, which shares this file; ignored here. */
  presetDescriptions?: Record<string, string>;
  /** Read by the Tasty VS Code extension, which shares this file; ignored here. */
  stateDescriptions?: Record<string, string>;
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
  /** Optional for compatibility with existing consumer-built configs. */
  styleFunctions?: Record<string, StyleFunctionConfig>;
  /** Optional for compatibility with existing consumer-built configs. */
  protectedComponents?: ProtectedComponentConfig[];
}
