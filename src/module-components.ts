import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import type ts from 'typescript';

/**
 * Whether an export of a relative module is a Tasty component.
 *
 * Elements of a design-system component usually live next to it in `styled.ts`
 * or `elements.ts`, so a rule that only recognises `tasty()` results declared in
 * the file being linted misses most of them. This reads the imported module the
 * same syntactic way: an export is a component when it is a `tasty()` call (or a
 * configured options-kind factory), a `const` alias of one, an import from a
 * configured source, or a re-export that leads to one of those.
 *
 * Parsing goes through TypeScript, an optional peer dependency. Without it, an
 * imported component is simply not recognised, which is how it was before.
 */
export interface ModuleComponentOptions {
  importSources: ReadonlySet<string>;
  /** Imported names whose call result is a Tasty component. */
  isComponentFactory(importedName: string): boolean;
}

type TypeScript = typeof ts;

interface ImportBinding {
  source: string;
  /** `'default'`, `'*'` for a namespace, or the exported name. */
  imported: string;
}

interface ModuleInfo {
  imports: Map<string, ImportBinding>;
  constants: Map<string, ts.Expression>;
  /** Exported name -> local name. */
  exports: Map<string, string>;
  reexports: Map<string, ImportBinding>;
  starSources: string[];
  defaultExpression?: ts.Expression;
}

const require = createRequire(import.meta.url);
let typescript: TypeScript | null | undefined;
const modules = new Map<string, { version: string; info: ModuleInfo }>();

const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];
// A TypeScript ESM import names the emitted file: `./styled.js` is `styled.ts`.
const SOURCE_EXTENSIONS: Record<string, string[]> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

function getTypeScript(): TypeScript | null {
  if (typescript === undefined) {
    try {
      const module = require('typescript') as Partial<TypeScript>;
      // TypeScript 7 (the native port) exports only its version.
      typescript =
        typeof module.createSourceFile === 'function'
          ? (module as TypeScript)
          : null;
    } catch {
      typescript = null;
    }
  }
  return typescript;
}

function version(filename: string): string | null {
  try {
    const stat = statSync(filename);
    return stat.isFile() ? `${stat.mtimeMs}:${stat.size}` : null;
  } catch {
    return null;
  }
}

/** Resolve a relative specifier the way a bundler would, without `paths`. */
export function resolveRelativeModule(
  fromFile: string,
  specifier: string,
): string | null {
  const base = resolve(dirname(fromFile), specifier);
  const extension = extname(base);
  const candidates = [
    ...(EXTENSIONS.includes(extension) ? [base] : []),
    ...(SOURCE_EXTENSIONS[extension] ?? []).map(
      (replacement) => base.slice(0, -extension.length) + replacement,
    ),
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, 'index' + ext)),
  ];

  return candidates.find((candidate) => version(candidate) !== null) ?? null;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const T = getTypeScript()!;
  return (
    T.canHaveModifiers(node) &&
    (T.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
  );
}

function readModule(filename: string): ModuleInfo | null {
  const T = getTypeScript();
  const current = version(filename);
  if (!T || current === null) return null;

  const cached = modules.get(filename);
  if (cached?.version === current) return cached.info;

  const source = T.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    T.ScriptTarget.Latest,
  );
  const info: ModuleInfo = {
    imports: new Map(),
    constants: new Map(),
    exports: new Map(),
    reexports: new Map(),
    starSources: [],
  };

  for (const statement of source.statements) {
    if (T.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      if (!T.isStringLiteral(statement.moduleSpecifier)) continue;
      const from = statement.moduleSpecifier.text;
      if (clause.name) {
        info.imports.set(clause.name.text, {
          source: from,
          imported: 'default',
        });
      }
      const bindings = clause.namedBindings;
      if (bindings && T.isNamespaceImport(bindings)) {
        info.imports.set(bindings.name.text, { source: from, imported: '*' });
      } else if (bindings) {
        for (const element of bindings.elements) {
          if (element.isTypeOnly) continue;
          info.imports.set(element.name.text, {
            source: from,
            imported: (element.propertyName ?? element.name).text,
          });
        }
      }
    } else if (T.isVariableStatement(statement)) {
      if (!(statement.declarationList.flags & T.NodeFlags.Const)) continue;
      const exported = hasModifier(statement, T.SyntaxKind.ExportKeyword);
      for (const declaration of statement.declarationList.declarations) {
        if (!T.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }
        const name = declaration.name.text;
        info.constants.set(name, declaration.initializer);
        if (exported) info.exports.set(name, name);
      }
    } else if (T.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      const from =
        statement.moduleSpecifier &&
        T.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : null;
      const clause = statement.exportClause;
      if (!clause) {
        if (from !== null) info.starSources.push(from);
      } else if (T.isNamedExports(clause)) {
        for (const element of clause.elements) {
          if (element.isTypeOnly) continue;
          const local = (element.propertyName ?? element.name).text;
          if (from === null) info.exports.set(element.name.text, local);
          else
            info.reexports.set(element.name.text, {
              source: from,
              imported: local,
            });
        }
      }
    } else if (T.isExportAssignment(statement) && !statement.isExportEquals) {
      info.defaultExpression = statement.expression;
    }
  }

  modules.set(filename, { version: current, info });
  return info;
}

/** Whether `exportName` of the module `specifier` (relative to `fromFile`) is a Tasty component. */
export function isModuleTastyComponent(
  fromFile: string,
  specifier: string,
  exportName: string,
  options: ModuleComponentOptions,
  visited = new Set<string>(),
): boolean {
  if (!specifier.startsWith('.')) return false;
  const filename = resolveRelativeModule(fromFile, specifier);
  if (filename === null) return false;

  const key = `${filename}\0${exportName}`;
  if (visited.has(key)) return false;
  visited.add(key);

  const info = readModule(filename);
  if (!info) return false;
  const T = getTypeScript()!;

  const fromImport = (binding: ImportBinding): boolean =>
    options.importSources.has(binding.source) ||
    (binding.imported !== '*' &&
      isModuleTastyComponent(
        filename,
        binding.source,
        binding.imported,
        options,
        visited,
      ));

  const seenLocals = new Set<string>();
  const fromLocal = (name: string): boolean => {
    if (seenLocals.has(name)) return false;
    seenLocals.add(name);
    const init = info.constants.get(name);
    if (init) return fromExpression(init);
    const binding = info.imports.get(name);
    return binding !== undefined && fromImport(binding);
  };

  const fromExpression = (node: ts.Expression): boolean => {
    while (
      T.isParenthesizedExpression(node) ||
      T.isAsExpression(node) ||
      T.isSatisfiesExpression(node) ||
      T.isNonNullExpression(node) ||
      T.isTypeAssertionExpression(node)
    ) {
      node = node.expression;
    }
    if (T.isIdentifier(node)) return fromLocal(node.text);
    if (T.isPropertyAccessExpression(node)) {
      // `UI.Panel` from `import * as UI from './ui'` is that module's `Panel`.
      if (T.isIdentifier(node.expression)) {
        const binding = info.imports.get(node.expression.text);
        if (
          binding?.imported === '*' &&
          !options.importSources.has(binding.source)
        ) {
          return isModuleTastyComponent(
            filename,
            binding.source,
            node.name.text,
            options,
            visited,
          );
        }
      }
      let root: ts.Expression = node;
      while (T.isPropertyAccessExpression(root)) root = root.expression;
      return T.isIdentifier(root) && fromLocal(root.text);
    }
    if (T.isCallExpression(node) && T.isIdentifier(node.expression)) {
      const binding = info.imports.get(node.expression.text);
      return (
        binding !== undefined &&
        options.importSources.has(binding.source) &&
        options.isComponentFactory(binding.imported)
      );
    }
    return false;
  };

  const local = info.exports.get(exportName);
  if (local !== undefined) return fromLocal(local);
  if (exportName === 'default' && info.defaultExpression) {
    return fromExpression(info.defaultExpression);
  }
  const reexport = info.reexports.get(exportName);
  if (reexport) return fromImport(reexport);
  if (exportName === 'default') return false;

  return info.starSources.some((source) =>
    isModuleTastyComponent(filename, source, exportName, options, visited),
  );
}

/** The package import an export of a relative module comes from. */
export interface ModuleExportOrigin {
  /** The package specifier, as written in the import. */
  source: string;
  /** The name the package exports it under. */
  name: string;
  /** Members read off that export: `['Group']` for `Button.Group`. */
  members: string[];
  /** Whether a component factory call, such as `tasty(Button)`, wraps it. */
  wrapped: boolean;
}

/**
 * An origin with more members read off it. A factory wrapper's members are its
 * own sub-elements, not the wrapped component's, so they lead nowhere.
 */
export function withMembers(
  origin: ModuleExportOrigin | null,
  members: string[],
): ModuleExportOrigin | null {
  if (!origin || members.length === 0) return origin;
  if (origin.wrapped) return null;
  return { ...origin, members: [...origin.members, ...members] };
}

export interface ModuleOriginOptions extends ModuleComponentOptions {
  /** Whether `export * from source` may provide the name being followed. */
  isOriginSource(source: string): boolean;
}

/**
 * Follow `exportName` of the module `specifier` (relative to `fromFile`) to the
 * package import it comes from: through re-exports, `const` aliases, namespace
 * members (`UI.Button` is `Button`), member reads (`Button.Group`), and factory
 * wrappers whose first argument is the component they extend.
 */
export function resolveModuleExportOrigin(
  fromFile: string,
  specifier: string,
  exportName: string,
  options: ModuleOriginOptions,
  visited = new Set<string>(),
): ModuleExportOrigin | null {
  if (!specifier.startsWith('.')) return null;
  const filename = resolveRelativeModule(fromFile, specifier);
  if (filename === null) return null;

  const key = `${filename}\0${exportName}`;
  if (visited.has(key)) return null;
  visited.add(key);

  const info = readModule(filename);
  if (!info) return null;
  const T = getTypeScript()!;

  /** `members` are read off the binding, so a namespace's first one is the export. */
  const fromImport = (
    binding: ImportBinding,
    members: string[] = [],
  ): ModuleExportOrigin | null => {
    const namespace = binding.imported === '*';
    const name = namespace ? members[0] : binding.imported;
    const rest = namespace ? members.slice(1) : members;
    if (name === undefined) return null;
    if (!binding.source.startsWith('.')) {
      return { source: binding.source, name, members: rest, wrapped: false };
    }
    return withMembers(
      resolveModuleExportOrigin(
        filename,
        binding.source,
        name,
        options,
        visited,
      ),
      rest,
    );
  };

  const seenLocals = new Set<string>();
  const fromLocal = (
    name: string,
    members: string[] = [],
  ): ModuleExportOrigin | null => {
    const seen = [name, ...members].join('.');
    if (seenLocals.has(seen)) return null;
    seenLocals.add(seen);
    const init = info.constants.get(name);
    if (init) return fromExpression(init, members);
    const binding = info.imports.get(name);
    return binding ? fromImport(binding, members) : null;
  };

  const fromExpression = (
    node: ts.Expression,
    members: string[] = [],
  ): ModuleExportOrigin | null => {
    while (
      T.isParenthesizedExpression(node) ||
      T.isAsExpression(node) ||
      T.isSatisfiesExpression(node) ||
      T.isNonNullExpression(node) ||
      T.isTypeAssertionExpression(node)
    ) {
      node = node.expression;
    }
    if (T.isIdentifier(node)) return fromLocal(node.text, members);
    if (T.isPropertyAccessExpression(node)) {
      let root: ts.Expression = node;
      const path = [...members];
      while (T.isPropertyAccessExpression(root)) {
        path.unshift(root.name.text);
        root = root.expression;
      }
      return T.isIdentifier(root) ? fromLocal(root.text, path) : null;
    }
    if (
      members.length === 0 &&
      T.isCallExpression(node) &&
      T.isIdentifier(node.expression)
    ) {
      const binding = info.imports.get(node.expression.text);
      const base = node.arguments[0];
      if (
        !binding ||
        !options.importSources.has(binding.source) ||
        !options.isComponentFactory(binding.imported) ||
        !base ||
        T.isObjectLiteralExpression(base)
      ) {
        return null;
      }
      const origin = fromExpression(base);
      return origin && { ...origin, wrapped: true };
    }
    return null;
  };

  const local = info.exports.get(exportName);
  if (local !== undefined) return fromLocal(local);
  if (exportName === 'default' && info.defaultExpression) {
    return fromExpression(info.defaultExpression);
  }
  const reexport = info.reexports.get(exportName);
  if (reexport) return fromImport(reexport);
  if (exportName === 'default') return null;

  for (const source of info.starSources) {
    const origin = source.startsWith('.')
      ? resolveModuleExportOrigin(
          filename,
          source,
          exportName,
          options,
          visited,
        )
      : options.isOriginSource(source)
        ? { source, name: exportName, members: [], wrapped: false }
        : null;
    if (origin) return origin;
  }
  return null;
}
