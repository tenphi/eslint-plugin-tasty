import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, Scope } from '@typescript-eslint/utils/ts-eslint';
import type { TastyContext } from './context.js';
import type { ResolvedConfig } from './types.js';
import { DIMENSION_STYLES, POSITION_STYLES } from './constants.js';
import {
  type ModuleExportOrigin,
  resolveModuleExportOrigin,
} from './module-components.js';
import { unwrapExpression, wildcardPattern } from './utils.js';

/** A component resolved to a `protectedComponents` entry. */
export interface ProtectedComponent {
  /** The name its source exports it under: `Button` for `<UI.Button>` or an alias. */
  name: string;
  source: string;
  /** Whether a `tasty()` wrapper sits between the reference and the export. */
  wrapped: boolean;
  allowedStyleProps: ReadonlySet<string>;
}

interface Entry {
  source: RegExp;
  include: RegExp[];
  exclude: RegExp[];
  allowedStyleProps: ReadonlySet<string>;
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
      include: strings('include').map(wildcardPattern),
      exclude: strings('exclude').map(wildcardPattern),
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
 * name, by the name their source exports them under. Aliases, namespace members
 * (`UI.Button`, and `Text.Strong` as `Text`), `const` aliases, `tasty()`
 * wrappers and relative re-exports are followed; relative modules need the
 * `typescript` package, as for other cross-file recognition.
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
    let member: string | undefined;
    while (root.type === 'JSXMemberExpression') {
      member = root.property.name;
      root = root.object;
    }
    if (root.type !== 'JSXIdentifier') return null;
    return this.match(this.resolveBinding(root, root.name, member, new Set()));
  }

  /** The protected component an expression, such as a `tasty()` base, refers to. */
  resolveExpression(node: TSESTree.Node): ProtectedComponent | null {
    return this.match(this.origin(node, undefined, new Set()));
  }

  private match(origin: ModuleExportOrigin | null): ProtectedComponent | null {
    if (!origin) return null;
    const entry = this.entries.find(
      (candidate) =>
        candidate.source.test(origin.source) &&
        candidate.include.some((pattern) => pattern.test(origin.name)) &&
        !candidate.exclude.some((pattern) => pattern.test(origin.name)),
    );
    return entry
      ? { ...origin, allowedStyleProps: entry.allowedStyleProps }
      : null;
  }

  private origin(
    node: TSESTree.Node,
    member: string | undefined,
    visited: Set<TSESTree.Node>,
  ): ModuleExportOrigin | null {
    const value = unwrapExpression(node);
    if (value.type === 'Identifier') {
      return this.resolveBinding(value, value.name, member, visited);
    }
    if (value.type === 'MemberExpression') {
      let root: TSESTree.Node = value;
      let first = member;
      while (root.type === 'MemberExpression') {
        if (root.computed || root.property.type !== 'Identifier') return null;
        first = root.property.name;
        root = unwrapExpression(root.object);
      }
      return root.type === 'Identifier'
        ? this.resolveBinding(root, root.name, first, visited)
        : null;
    }
    if (
      member === undefined &&
      value.type === 'CallExpression' &&
      this.isWrapperCall(value)
    ) {
      const origin = this.origin(value.arguments[0], undefined, visited);
      return origin && { ...origin, wrapped: true };
    }
    return null;
  }

  /** `member` is the first property read off the binding, as in `UI.Button`. */
  private resolveBinding(
    reference: TSESTree.Node,
    localName: string,
    member: string | undefined,
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
    const key = member ?? '';
    if (cache.has(key)) return cache.get(key)!;

    const result = this.resolveDefinition(variable.defs[0], member, visited);
    cache.set(key, result);
    return result;
  }

  private resolveDefinition(
    def: Scope.Definition,
    member: string | undefined,
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
      if (specifier.type === 'ImportNamespaceSpecifier') name = member;
      else if (specifier.type === 'ImportDefaultSpecifier') name = 'default';
      else if (specifier.type === 'ImportSpecifier') {
        if (specifier.importKind === 'type') return null;
        name = importedName(specifier);
      }
      if (name === undefined) return null;

      const source = def.parent.source.value;
      if (!source.startsWith('.')) return { source, name, wrapped: false };
      return this.moduleOrigin(source, name);
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
    return this.origin(def.node.init, member, visited);
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
