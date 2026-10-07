import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

/** Experimental, independently managed TypeScript analysis for either linter. */
export interface TypeAwareJSXOptions {
  /** tsconfig path relative to the linter's cwd; otherwise find the nearest one. */
  project?: string;
}

type PropKind = 'style' | 'component' | 'unknown';
type TypeScript = typeof ts;
type Classifier = (attribute: TSESTree.JSXAttribute) => PropKind;

interface Project {
  config: ts.ParsedCommandLine;
  configVersions: Map<string, string>;
  program?: ts.Program;
  versions: Map<string, string>;
  overlay?: { filename: string; text: string };
}

const require = createRequire(import.meta.url);
let typescript: TypeScript | undefined;
const projects = new Map<string, Project>();
// All value rules share one classifier for a file, including in Oxlint.
const classifiers = new WeakMap<
  object,
  Map<
    string,
    {
      filename: string;
      text: string;
      classify: Classifier;
    }
  >
>();

function getTypeScript(): TypeScript {
  if (!typescript) {
    try {
      typescript = require('typescript') as TypeScript;
    } catch {
      throw new Error(
        'tasty: typeAwareJSX requires TypeScript. Install typescript as a dev dependency.',
      );
    }
  }
  return typescript;
}

function version(filename: string): string {
  try {
    const stat = statSync(filename);
    return `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  } catch {
    return 'missing';
  }
}

function changed(versions: Map<string, string>): boolean {
  for (const [filename, previous] of versions) {
    if (version(filename) !== previous) return true;
  }
  return false;
}

function readProject(T: TypeScript, configPath: string): Project {
  const configVersions = new Map<string, string>();
  const config = T.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...T.sys,
      readFile(filename) {
        configVersions.set(filename, version(filename));
        return T.sys.readFile(filename);
      },
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(
          `tasty: ${T.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
        );
      },
    },
  );
  if (!config || config.errors.length) {
    throw new Error(
      `tasty: invalid typeAwareJSX project ${configPath}: ${config?.errors
        .map((d) => T.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`,
    );
  }
  return { config, configVersions, versions: new Map() };
}

function getProgram(
  T: TypeScript,
  configPath: string,
  filename: string,
  text: string,
): ts.Program {
  let project = projects.get(configPath);
  if (
    !project ||
    changed(project.configVersions) ||
    (project.program && !project.program.getSourceFile(filename))
  ) {
    project = readProject(T, configPath);
  }
  // Bound retained compiler graphs in long-lived editor processes.
  projects.delete(configPath);
  projects.set(configPath, project);
  if (projects.size > 3) projects.delete(projects.keys().next().value!);

  const overlay =
    T.sys.readFile(filename) === text ? undefined : { filename, text };
  const overlayChanged =
    project.overlay?.filename !== overlay?.filename ||
    project.overlay?.text !== overlay?.text;
  if (!project.program || overlayChanged || changed(project.versions)) {
    const host = T.createCompilerHost(project.config.options, true);
    const readFile = host.readFile;
    host.readFile = (path) =>
      resolve(path) === overlay?.filename ? overlay.text : readFile(path);
    project.program = T.createProgram({
      rootNames: project.config.fileNames,
      options: project.config.options,
      projectReferences: project.config.projectReferences,
      host,
      oldProgram: project.program,
    });
    project.overlay = overlay;
    project.versions = new Map(
      project.program
        .getSourceFiles()
        .map((file) => [file.fileName, version(file.fileName)]),
    );
  }
  return project.program;
}

function makeClassifier(
  T: TypeScript,
  program: ts.Program,
  filename: string,
  text: string,
): Classifier {
  const source = program.getSourceFile(filename);
  // Excluded files and virtual/transformed source keep the existing heuristic.
  if (!source || source.text !== text) return () => 'unknown';
  const checker = program.getTypeChecker();
  const modulePath = T.resolveModuleName(
    '@tenphi/tasty',
    filename,
    program.getCompilerOptions(),
    T.sys,
  ).resolvedModule?.resolvedFileName;
  const moduleFile = modulePath && program.getSourceFile(modulePath);
  const module = moduleFile && checker.getSymbolAtLocation(moduleFile);
  const exports = module ? checker.getExportsOfModule(module) : [];
  const styleTypeSymbols = new Set(
    exports
      ?.filter((s) =>
        ['Styles', 'StyleValue', 'StyleValueStateMap'].includes(s.name),
      )
      .map((s) =>
        s.flags & T.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s,
      ),
  );
  let symbol = exports?.find((s) => s.name === 'Styles');
  if (symbol && symbol.flags & T.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  const styles = symbol && checker.getDeclaredTypeOfSymbol(symbol);
  if (!styles || styles.flags & (T.TypeFlags.Any | T.TypeFlags.Unknown)) {
    return () => 'unknown';
  }
  const styleDeclarations = new Set(
    styles.getProperties().flatMap((property) => property.declarations ?? []),
  );
  // A dependency may resolve a different copy of either styling package.
  function isStyleDeclaration(declaration: ts.Declaration): boolean {
    return (
      styleDeclarations.has(declaration) ||
      /[/\\]node_modules[/\\](?:@tenphi[/\\]tasty|csstype)[/\\]/.test(
        declaration.getSourceFile().fileName,
      )
    );
  }
  const attributes = new Map<number, ts.JsxAttribute>();
  function collect(node: ts.Node): void {
    if (T.isJsxAttribute(node)) attributes.set(node.getStart(source), node);
    T.forEachChild(node, collect);
  }
  collect(source);

  function referencesStyles(
    node: ts.Node,
    visited = new Set<ts.Node>(),
  ): boolean {
    if (visited.has(node)) return false;
    visited.add(node);
    if (T.isIndexedAccessTypeNode(node)) {
      const object = checker.getTypeFromTypeNode(node.objectType);
      if (
        object === styles ||
        object
          .getProperties()
          .some((p) => p.declarations?.some(isStyleDeclaration))
      )
        return true;
    }
    if (T.isTypeReferenceNode(node)) {
      let reference = checker.getSymbolAtLocation(node.typeName);
      if (reference && reference.flags & T.SymbolFlags.Alias) {
        reference = checker.getAliasedSymbol(reference);
      }
      if (reference && styleTypeSymbols.has(reference)) return true;
      if (reference?.declarations?.some(isStyleDeclaration)) return true;
      if (
        reference?.declarations?.some(
          (declaration) =>
            T.isTypeAliasDeclaration(declaration) &&
            referencesStyles(declaration.type, visited),
        )
      )
        return true;
    }
    return (
      T.forEachChild(
        node,
        (child) => referencesStyles(child, visited) || undefined,
      ) ?? false
    );
  }

  function unresolved(type: ts.Type): boolean {
    if (
      type.flags &
      (T.TypeFlags.Any |
        T.TypeFlags.Unknown |
        T.TypeFlags.TypeParameter |
        T.TypeFlags.Never)
    )
      return true;
    return type.isUnionOrIntersection() && type.types.some(unresolved);
  }

  const results = new Map<number, PropKind>();
  return (attribute) => {
    const start = attribute.range[0];
    const cached = results.get(start);
    if (cached) return cached;
    const node = attributes.get(start);
    let kind: PropKind = 'unknown';
    if (node && node.end === attribute.range[1] && T.isIdentifier(node.name)) {
      const props = checker.getContextualType(node.parent);
      const property =
        props && checker.getPropertyOfType(props, node.name.text);
      const declarations = property?.declarations;
      if (property && declarations?.length) {
        const type = checker.getTypeOfSymbolAtLocation(property, node);
        if (
          declarations.some((d) => isStyleDeclaration(d) || referencesStyles(d))
        ) {
          kind = 'style';
        } else if (!unresolved(type)) {
          // Broad primitives may be hand-written style props. Preserve checks.
          const nonNullable = checker.getNonNullableType(type);
          const parts = nonNullable.isUnion()
            ? nonNullable.types
            : [nonNullable];
          const broad =
            T.TypeFlags.String | T.TypeFlags.Number | T.TypeFlags.BooleanLike;
          if (!parts.every((part) => Boolean(part.flags & broad)))
            kind = 'component';
        }
      }
    }
    results.set(start, kind);
    return kind;
  };
}

/** No compiler is loaded, or program created, unless the setting is enabled. */
export function jsxPropKind(
  context: RuleContext<string, unknown[]>,
  attribute: TSESTree.JSXAttribute,
): PropKind {
  const settings = context.settings.tasty as
    | { typeAwareJSX?: boolean | TypeAwareJSXOptions }
    | undefined;
  const option = settings?.typeAwareJSX;
  if (option === undefined || option === false) return 'unknown';
  if (
    option !== true &&
    (!option ||
      typeof option !== 'object' ||
      Array.isArray(option) ||
      (option.project !== undefined && typeof option.project !== 'string'))
  )
    throw new Error(
      'tasty: typeAwareJSX must be true, false, or { project: string }.',
    );

  const T = getTypeScript();
  const filename = resolve(context.filename);
  const explicit = option === true ? undefined : option.project;
  const configPath = explicit
    ? resolve(context.cwd, explicit)
    : T.findConfigFile(dirname(filename), T.sys.fileExists);
  if (!configPath)
    throw new Error(
      `tasty: typeAwareJSX could not find a tsconfig for ${filename}.`,
    );

  const sourceCode = context.sourceCode;
  let byProject = classifiers.get(sourceCode);
  if (!byProject) {
    byProject = new Map();
    classifiers.set(sourceCode, byProject);
  }
  let cached = byProject.get(configPath);
  if (
    !cached ||
    cached.filename !== filename ||
    cached.text !== sourceCode.text
  ) {
    const program = getProgram(T, configPath, filename, sourceCode.text);
    cached = {
      filename,
      text: sourceCode.text,
      classify: makeClassifier(T, program, filename, sourceCode.text),
    };
    byProject.set(configPath, cached);
  }
  return cached.classify(attribute);
}
