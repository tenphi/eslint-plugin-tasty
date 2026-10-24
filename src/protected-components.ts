import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, Scope } from '@typescript-eslint/utils/ts-eslint';
import type { TastyContext } from './context.js';
import type { ResolvedConfig } from './types.js';
import { DIMENSION_STYLES, POSITION_STYLES } from './constants.js';
import {
  type ModuleExportOrigin,
  resolveModuleExportOrigin,
  withMembers,
} from './module-components.js';
import { unwrapExpression, wildcardPattern } from './utils.js';

/** A component resolved to a `protectedComponents` entry. */
export interface ProtectedComponent {
  /**
   * The name it is protected under: the export name (`Button` for `<UI.Button>`,
   * an alias or `<Button.Split>`), or the member path an entry names, such as
   * `Button.Group`.
   */
  name: string;
  source: string;
  /** Whether a `tasty()` wrapper sits between the reference and the export. */
  wrapped: boolean;
  allowedStyleProps: ReadonlySet<string>;
}

interface Pattern {
  regex: RegExp;
  /** Names a member path, such as `Button.Group` or `Button.*`. */
  member: boolean;
}

interface Entry {
  source: RegExp;
  include: Pattern[];
  exclude: Pattern[];
  allowedStyleProps: ReadonlySet<string>;
}

function namePattern(pattern: string): Pattern {
  return { regex: wildcardPattern(pattern), member: pattern.includes('.') };
}

const STYLE_PROP_GROUPS = new Map<string, readonly string[]>([
  ['position', POSITION_STYLES],
  ['dimension', DIMENSION_STYLES],
]);

const entriesByConfig = new WeakMap<ResolvedConfig, Entry[]>();

function readEntries(config: ResolvedConfig): Entry[] {
  let entries = entriesByConfig.get(config);
  if (entries) return entries;

  const list: unknown = config.protectedComponents ?? [];
  if (!Array.isArray(list)) {
    throw new Error('tasty: protectedComponents must be an array.');
  }
  entries = list.map((item: unknown, index): Entry => {
    const at = `tasty: protectedComponents[${index}]`;
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as { source?: unknown }).source !== 'string'
    ) {
      throw new Error(`${at} must be an object with a string 'source'.`);
    }
    const entry = item as Record<string, unknown>;
    const strings = (key: string): string[] => {
      const value = entry[key];
      if (value === undefined) return key === 'include' ? ['*'] : [];
      if (
        !Array.isArray(value) ||
        value.some((name) => typeof name !== 'string')
      ) {
        throw new Error(`${at}.${key} must be an array of strings.`);
      }
      return value as string[];
    };
    return {
      source: wildcardPattern(entry.source as string),
      include: strings('include').map(namePattern),
      exclude: strings('exclude').map(namePattern),
      allowedStyleProps: new Set(
        strings('allowedStyleProps').flatMap(
          (name) => STYLE_PROP_GROUPS.get(name) ?? [name],
        ),
      ),
    };
  });
  entriesByConfig.set(config, entries);
  return entries;
}

function importedName(specifier: TSESTree.ImportSpecifier): string {
  return specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : specifier.imported.value;
}

/**
 * Resolves JSX tags and `tasty()` bases to the `protectedComponents` entry they
 * name, by the name their source exports them under plus any members read off
 * it (`Button.Group`). Aliases, namespace members (`UI.Button`), `const`
 * aliases, `tasty()` wrappers and relative re-exports are followed; relative
 * modules need the `typescript` package, as for other cross-file recognition.
 */
export class ProtectedComponents {
  private entries: Entry[];
  private bindings = new WeakMap<
    Scope.Variable,
    Map<string, ModuleExportOrigin | null>
  >();
  private modules = new Map<string, ModuleExportOrigin | null>();

  constructor(
    private context: RuleContext<string, unknown[]>,
    private ctx: TastyContext,
  ) {
    this.entries = readEntries(ctx.config);
  }

  get enabled(): boolean {
    return this.entries.length > 0;
  }

  /** `tasty(Base, ...)`: a Tasty wrapper of an existing component. */
  isWrapperCall(node: TSESTree.CallExpression): boolean {
    const base = node.arguments[0];
    return (
      this.ctx.isTastyCall(node)?.importedName === 'tasty' &&
      base !== undefined &&
      base.type !== 'SpreadElement' &&
      unwrapExpression(base).type !== 'ObjectExpression'
    );
  }

  /** The protected component a JSX tag name refers to. */
  resolveTag(name: TSESTree.JSXTagNameExpression): ProtectedComponent | null {
    // `<button>` is a native element whatever a `button` binding holds.
    if (name.type === 'JSXIdentifier' && !/^[A-Z]/.test(name.name)) return null;
    let root = name;
    const members: string[] = [];
    while (root.type === 'JSXMemberExpression') {
      members.unshift(root.property.name);
      root = root.object;
    }
    if (root.type !== 'JSXIdentifier') return null;
    return this.match(this.resolveBinding(root, root.name, members, new Set()));
  }

  /** The protected component an expression, such as a `tasty()` base, refers to. */
  resolveExpression(node: TSESTree.Node): ProtectedComponent | null {
    return this.match(this.origin(node, [], new Set()));
  }

  /**
   * The most specific name decides: an entry that names a member path
   * (`Button.Group`, `Button.*`) in `include` or `exclude` wins over one that
   * matches only the export, so a sub-component that is a separate component
   * can follow its own entry. Longer paths are tried first.
   */
  private match(origin: ModuleExportOrigin | null): ProtectedComponent | null {
    if (!origin) return null;
    const entries = this.entries.filter((entry) =>
      entry.source.test(origin.source),
    );
    const protect = (name: string, entry: Entry): ProtectedComponent => ({
      name,
      source: origin.source,
      wrapped: origin.wrapped,
      allowedStyleProps: entry.allowedStyleProps,
    });

    const parts = [origin.name, ...origin.members];
    for (let length = parts.length; length > 1; length--) {
      const path = parts.slice(0, length).join('.');
      const names = (patterns: Pattern[]) =>
        patterns.some((pattern) => pattern.member && pattern.regex.test(path));
      for (const entry of entries) {
        if (names(entry.exclude)) return null;
        if (names(entry.include)) return protect(path, entry);
      }
    }

    const matches = (patterns: Pattern[]) =>
      patterns.some(
        (pattern) => !pattern.member && pattern.regex.test(origin.name),
      );
    const entry = entries.find(
      (candidate) => matches(candidate.include) && !matches(candidate.exclude),
    );
    return entry ? protect(origin.name, entry) : null;
  }

  private origin(
    node: TSESTree.Node,
    members: string[],
    visited: Set<TSESTree.Node>,
  ): ModuleExportOrigin | null {
    const value = unwrapExpression(node);
    if (value.type === 'Identifier') {
      return this.resolveBinding(value, value.name, members, visited);
    }
    if (value.type === 'MemberExpression') {
      let root: TSESTree.Node = value;
      const path = [...members];
      while (root.type === 'MemberExpression') {
        if (root.computed || root.property.type !== 'Identifier') return null;
        path.unshift(root.property.name);
        root = unwrapExpression(root.object);
      }
      return root.type === 'Identifier'
        ? this.resolveBinding(root, root.name, path, visited)
        : null;
    }
    if (
      members.length === 0 &&
      value.type === 'CallExpression' &&
      this.isWrapperCall(value)
    ) {
      const origin = this.origin(value.arguments[0], [], visited);
      return origin && { ...origin, wrapped: true };
    }
    return null;
  }

  /** `members` are the properties read off the binding, as in `UI.Button.Group`. */
  private resolveBinding(
    reference: TSESTree.Node,
    localName: string,
    members: string[],
    visited: Set<TSESTree.Node>,
  ): ModuleExportOrigin | null {
    let scope: Scope.Scope | null = this.context.sourceCode.getScope(reference);
    while (scope && !scope.set.has(localName)) scope = scope.upper;
    const variable = scope?.set.get(localName);
    if (!variable || variable.defs.length !== 1) return null;

    let cache = this.bindings.get(variable);
    if (!cache) {
      cache = new Map();
      this.bindings.set(variable, cache);
    }
    const key = members.join('.');
    if (cache.has(key)) return cache.get(key)!;

    const result = this.resolveDefinition(variable.defs[0], members, visited);
    cache.set(key, result);
    return result;
  }

  private resolveDefinition(
    def: Scope.Definition,
    members: string[],
    visited: Set<TSESTree.Node>,
  ): ModuleExportOrigin | null {
    if (def.type === 'ImportBinding') {
      if (
        def.parent.type !== 'ImportDeclaration' ||
        def.parent.importKind === 'type'
      ) {
        return null;
      }
      const specifier = def.node;
      let name: string | undefined;
      let rest = members;
      if (specifier.type === 'ImportNamespaceSpecifier') {
        [name, ...rest] = members;
      } else if (specifier.type === 'ImportDefaultSpecifier') name = 'default';
      else if (specifier.type === 'ImportSpecifier') {
        if (specifier.importKind === 'type') return null;
        name = importedName(specifier);
      }
      if (name === undefined) return null;

      const source = def.parent.source.value;
      if (!source.startsWith('.')) {
        return { source, name, members: rest, wrapped: false };
      }
      return withMembers(this.moduleOrigin(source, name), rest);
    }

    if (
      def.type !== 'Variable' ||
      def.parent.kind !== 'const' ||
      def.node.id.type !== 'Identifier' ||
      !def.node.init ||
      visited.has(def.node)
    ) {
      return null;
    }
    visited.add(def.node);
    return this.origin(def.node.init, members, visited);
  }

  private moduleOrigin(
    source: string,
    exportName: string,
  ): ModuleExportOrigin | null {
    const key = `${source}\0${exportName}`;
    if (!this.modules.has(key)) {
      this.modules.set(
        key,
        resolveModuleExportOrigin(this.context.filename, source, exportName, {
          importSources: this.ctx.trackedSources,
          isComponentFactory: (name) => name === 'tasty',
          isOriginSource: (candidate) =>
            this.entries.some((entry) => entry.source.test(candidate)),
        }),
      );
    }
    return this.modules.get(key)!;
  }
}
