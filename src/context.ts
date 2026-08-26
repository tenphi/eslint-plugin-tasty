import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { ResolvedConfig } from './types.js';
import { loadConfig } from './config.js';
import {
  DEFAULT_IMPORT_SOURCES,
  KNOWN_CSS_PROPERTIES,
  KNOWN_TASTY_PROPERTIES,
  SPECIAL_STYLE_KEYS,
} from './constants.js';
import { getKeyName } from './utils.js';

/**
 * AST selectors that match ObjectExpressions in all known tasty style contexts:
 * call sites, variable declarations, satisfies/as expressions.
 */
export const STYLE_OBJECT_SELECTORS = [
  'CallExpression ObjectExpression',
  'VariableDeclarator > ObjectExpression',
  'VariableDeclarator > TSSatisfiesExpression > ObjectExpression',
  'VariableDeclarator > TSAsExpression > ObjectExpression',
  // `<Block styles={{…}} />`. Safe to match on the prop name alone: React's own
  // prop is `style`, singular, so a plural `styles` JSX prop is a Tasty
  // convention.
  "JSXAttribute[name.name='styles'] > JSXExpressionContainer > ObjectExpression",
  // A Storybook story's `args.styles`. Deliberately this specific rather than
  // matching any `styles` key: plenty of unrelated libraries take a `styles`
  // option object, and a bare key carries no evidence it is Tasty's. Story files
  // are where a lot of style code is authored and neither the call-site nor the
  // variable-name heuristic reaches them — the enclosing variable is named after
  // the story, and there is no Tasty call.
  // Superset of the `args.styles` shape; `isStylesPropertyValue` is the real
  // gate, so both `styles` and `'styles'` key forms are covered.
  'Property > ObjectExpression > Property > ObjectExpression',
] as const;

/**
 * Creates a record of ESLint listeners that all point to the same handler,
 * one entry per style-object AST selector.
 */
export function styleObjectListeners(
  handler: (node: TSESTree.ObjectExpression) => void,
): Record<string, (node: TSESTree.ObjectExpression) => void> {
  const listeners: Record<string, (node: TSESTree.ObjectExpression) => void> =
    {};

  // Selectors overlap — `tasty({ styles: {…} })` matches both
  // `CallExpression ObjectExpression` and the `styles` key selector — so the
  // handler must run at most once per object, or every rule double-reports.
  const visited = new WeakSet<TSESTree.ObjectExpression>();
  const once = (node: TSESTree.ObjectExpression) => {
    if (visited.has(node)) return;
    visited.add(node);
    handler(node);
  };

  for (const selector of STYLE_OBJECT_SELECTORS) {
    listeners[selector] = once;
  }

  return listeners;
}

export interface StyleContext {
  type: 'tasty' | 'tastyStatic' | 'useStyles' | 'useGlobalStyles';
  isStaticCall: boolean;
  isSelectorMode: boolean;
  isExtending: boolean;
  /**
   * Local name of the component this layer extends, when there is one and it is
   * an identifier. `null` covers every other case — a base definition, a
   * selector, or a layer whose base cannot be read off the AST — so a rule that
   * cares must treat `null` as "unknown", not as "not extending".
   */
  baseComponent: string | null;
}

export interface TastyImport {
  localName: string;
  importedName: string;
  source: string;
}

/**
 * Whether a type annotation names tasty's `Styles` anywhere inside it.
 *
 * Walks the annotation rather than matching only the outermost reference, so a
 * wrapped tasty type (`Styles | undefined`, `Record<string, Styles>`,
 * `{ root: Styles }`) is recognised while `CSSProperties` in the same positions is
 * not. Deliberately name-based: the plugin has no type checker, and requiring one
 * would make every rule type-aware.
 */
function referencesStylesType(node: TSESTree.TypeNode): boolean {
  const stack: TSESTree.Node[] = [node];

  while (stack.length) {
    const current = stack.pop()!;

    if (
      current.type === 'TSTypeReference' &&
      current.typeName.type === 'Identifier' &&
      /^Styles$/i.test(current.typeName.name)
    ) {
      return true;
    }

    for (const value of Object.values(
      current as unknown as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            stack.push(item as TSESTree.Node);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Skip `parent` — it points back up the tree and would loop forever.
        if (value !== (current as TSESTree.Node).parent) {
          stack.push(value as TSESTree.Node);
        }
      }
    }
  }

  return false;
}

/**
 * Whether a key could plausibly be a tasty style key.
 *
 * Covers every top-level shape tasty accepts: a style property, a sub-element
 * (capitalised), an at-rule or state/custom-property/colour key (`@`, `&`, `$`,
 * `#`), and the default-state key.
 */
function isPlausibleStyleKey(key: string): boolean {
  if (key === '' || key === '_') return true;
  if (/^[A-Z]/.test(key)) return true;
  if (/^[@&$#]/.test(key)) return true;
  if (SPECIAL_STYLE_KEYS.has(key)) return true;

  return KNOWN_TASTY_PROPERTIES.has(key) || KNOWN_CSS_PROPERTIES.has(key);
}

/**
 * Whether an object is a map of named CSS blocks rather than a tasty styles object.
 *
 * The shape is unmistakable — `{ table: {…}, th: {…}, td: {…} }`, `{ root: {…},
 * toolbar: {…} }` — and it is what a React inline-style map looks like when it
 * carries no type annotation to opt it out. Every key is a block name that is not a
 * style key, and every value is an object.
 *
 * Requiring *every* value to be an object literal is what keeps this from swallowing
 * the case it would hurt most: `const styles = { colour: 'red' }` has a string value,
 * so it is not treated as a block map and `known-property` still reports the typo.
 * Otherwise the rule that catches a misspelled property would be silenced by the
 * misspelling.
 */
function isNamedCssBlockMap(node: TSESTree.ObjectExpression): boolean {
  if (node.properties.length === 0) return false;

  for (const prop of node.properties) {
    if (prop.type !== 'Property' || prop.computed) return false;

    const key = getKeyName(prop.key);

    if (key === null || isPlausibleStyleKey(key)) return false;
    if (prop.value.type !== 'ObjectExpression') return false;
  }

  return true;
}

/**
 * The component a `styles` JSX prop overrides — `<Card styles={…} />` -> `Card`.
 * A namespaced tag (`<UI.Card />`) resolves to its root object, since that is the
 * name an import can be matched against.
 */
function jsxStylesPropTarget(node: TSESTree.ObjectExpression): string | null {
  const container = node.parent;
  if (container?.type !== 'JSXExpressionContainer') return null;

  const attribute = container.parent;
  if (attribute?.type !== 'JSXAttribute') return null;

  const element = attribute.parent;
  if (element?.type !== 'JSXOpeningElement') return null;

  let name: TSESTree.JSXTagNameExpression = element.name;
  while (name.type === 'JSXMemberExpression') name = name.object;

  return name.type === 'JSXIdentifier' ? name.name : null;
}

/**
 * Strips the wrappers that carry no runtime value — `Button as any`, `Button!`,
 * `Button satisfies T`, `<T>Button` — so the expression underneath can be read.
 */
function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  let current = node;

  while (
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSNonNullExpression' ||
    current.type === 'TSTypeAssertion' ||
    current.type === 'TSInstantiationExpression'
  ) {
    current = current.expression;
  }

  return current;
}

/**
 * The identifier a base-component argument resolves to — `tasty(UI.Card, {…})`
 * -> `UI`, which is what the import map is keyed by.
 *
 * Type assertions are stripped on the way down. Reading `Button as any` as an
 * unknown base would quietly promote an imported component to "owned", which is
 * the reading that produces a warning the author cannot act on.
 */
function baseComponentName(node: TSESTree.Node): string | null {
  let current = unwrapExpression(node);

  while (current.type === 'MemberExpression') {
    current = unwrapExpression(current.object);
  }

  return current.type === 'Identifier' ? current.name : null;
}

/**
 * Whether `source` is inside this project. Relative and absolute specifiers are,
 * as are the conventional in-repo aliases (`~/`, `#internal`, `@/`) — `@` alone
 * is not, since `@scope/pkg` is a published package.
 */
function isInRepoSource(source: string): boolean {
  return (
    source.startsWith('.') ||
    source.startsWith('/') ||
    source.startsWith('~') ||
    source.startsWith('#') ||
    source.startsWith('@/')
  );
}

/** Matches a source against an `ownedSources` pattern, where `*` is any run of characters. */
function matchesSourcePattern(pattern: string, source: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^${escaped.replace(/\\\*/g, '.*')}$`).test(source);
}

const TASTY_FUNCTION_NAMES = new Set([
  'tasty',
  'tastyStatic',
  'useStyles',
  'useGlobalStyles',
  'configure',
]);

/**
 * Context tracker for a single file's lint pass.
 * Tracks which imports come from tasty and provides
 * helpers to determine if a node is in a tasty style context.
 */
export class TastyContext {
  readonly config: ResolvedConfig;
  private imports = new Map<string, TastyImport>();
  private moduleSources = new Map<string, string>();
  private importSources: Set<string>;

  constructor(
    private context: RuleContext<string, unknown[]>,
    config?: ResolvedConfig,
  ) {
    this.config = config ?? loadConfig(context.filename);
    this.importSources = new Set([
      ...DEFAULT_IMPORT_SOURCES,
      ...this.config.importSources,
    ]);
  }

  trackImport(node: TSESTree.ImportDeclaration): void {
    const source = node.source.value;

    // Every import is recorded, tasty or not. Where a *base component* comes
    // from is what tells a rule whether the file it would send the author to
    // edit is even theirs — see `isOwnedComponent`.
    for (const specifier of node.specifiers) {
      this.moduleSources.set(specifier.local.name, source);
    }

    if (!this.importSources.has(source)) return;

    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const importedName =
          specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : specifier.imported.value;
        if (TASTY_FUNCTION_NAMES.has(importedName)) {
          this.imports.set(specifier.local.name, {
            localName: specifier.local.name,
            importedName,
            source,
          });
        }
      }
    }
  }

  getImport(localName: string): TastyImport | undefined {
    return this.imports.get(localName);
  }

  /**
   * Whether the base component an extension layer sits on top of lives in a file
   * this project can edit — so a rule can decide whether pointing the author at
   * the base's own definition is advice they can act on.
   *
   * A name that was never imported is declared in this very file, and an unknown
   * base (`null`) counts as owned as well: staying quiet is for a base that is
   * demonstrably someone else's, never for one the plugin merely failed to read.
   */
  isOwnedComponent(localName: string | null): boolean {
    if (localName === null) return true;

    const source = this.moduleSources.get(localName);
    if (source === undefined) return true;
    if (isInRepoSource(source)) return true;

    // `ownedSources` is optional on the public `ResolvedConfig`, so a config
    // built by a consumer rather than by `loadConfig` may not carry it.
    return (this.config.ownedSources ?? []).some((pattern) =>
      matchesSourcePattern(pattern, source),
    );
  }

  isTastyCall(node: TSESTree.CallExpression): TastyImport | undefined {
    if (node.callee.type !== 'Identifier') return undefined;
    return this.imports.get(node.callee.name);
  }

  /**
   * Determines whether an object expression is a tasty style object
   * by walking up the AST to find a recognized call expression.
   */
  isStyleObject(node: TSESTree.ObjectExpression): boolean {
    return this.getStyleContext(node) !== null;
  }

  getStyleContext(node: TSESTree.Node): StyleContext | null {
    // Sub-element objects inherit their parent style object's context
    if (node.type === 'ObjectExpression') {
      const parent = node.parent;
      if (parent?.type === 'Property' && !parent.computed) {
        const key = getKeyName(parent.key);
        if (key && /^[A-Z]/.test(key)) {
          const grandparent = parent.parent;
          if (grandparent?.type === 'ObjectExpression') {
            return this.getStyleContext(grandparent);
          }
        }
      }
    }

    // An object assigned to a `styles` key (or a `styles` JSX prop) is a style
    // object on its own terms — no enclosing tasty call or `styles`-ish variable
    // name required. Checked before the walk, which would otherwise climb past it
    // to an unrelated call or declaration and reject the whole thing.
    if (node.type === 'ObjectExpression' && this.isStylesPropertyValue(node)) {
      // A `styles` prop is an override layer by construction: the component it
      // is handed to already carries its own styles and this object lands on
      // top of them. A Storybook `args.styles` is the same prop by another name,
      // but the component behind `args` is not on the AST path, so its base
      // stays unknown.
      return {
        type: 'tasty',
        isStaticCall: false,
        isSelectorMode: false,
        isExtending: true,
        baseComponent: jsxStylesPropTarget(node),
      };
    }

    let current: TSESTree.Node | undefined = node;

    while (current) {
      if (current.type === 'CallExpression') {
        const imp = this.isTastyCall(current);
        if (!imp) return null;

        const name = imp.importedName;
        const isStaticCall = name === 'tastyStatic';

        if (name === 'tasty') {
          return this.getTastyCallContext(current, node);
        }

        if (name === 'tastyStatic') {
          return this.getTastyStaticCallContext(current, node);
        }

        if (name === 'useStyles') {
          if (current.arguments[0] === node) {
            return {
              type: 'useStyles',
              isStaticCall: false,
              isSelectorMode: false,
              isExtending: false,
              baseComponent: null,
            };
          }
        }

        if (name === 'useGlobalStyles') {
          if (current.arguments[1] === node) {
            return {
              type: 'useGlobalStyles',
              isStaticCall,
              isSelectorMode: true,
              isExtending: false,
              baseComponent: null,
            };
          }
        }

        return null;
      }

      if (this.isStyleVariableDeclaration(current, node)) {
        return {
          type: 'tasty',
          isStaticCall: false,
          isSelectorMode: false,
          isExtending: false,
          baseComponent: null,
        };
      }

      current = current.parent;
    }

    return null;
  }

  private isStyleVariableDeclaration(
    current: TSESTree.Node,
    targetNode: TSESTree.Node,
  ): boolean {
    if (
      current.type !== 'VariableDeclarator' ||
      current.id.type !== 'Identifier'
    ) {
      return false;
    }

    let init: TSESTree.Node | null | undefined = current.init;
    while (
      init?.type === 'TSAsExpression' ||
      init?.type === 'TSSatisfiesExpression' ||
      init?.type === 'TSTypeAssertion' ||
      init?.type === 'TSNonNullExpression'
    ) {
      init = (init as TSESTree.TSAsExpression).expression;
    }

    if (init !== targetNode) return false;

    const name = current.id.name;

    if (/^[A-Z][A-Z0-9_]*$/.test(name)) return false;

    // An explicit type annotation is authoritative, in both directions. The name
    // heuristic below is a guess; a declared type is the author stating what the
    // object is, so it wins.
    //
    // This matters because the rewrites these rules offer are only valid *inside*
    // tasty: `#purple.05` and `$font-sans` are correct tasty declarations and
    // meaningless as raw CSS. A `const styles: Record<string, CSSProperties>`
    // handed to React's `style={…}` was matched on name alone, so its plain CSS
    // longhands were reported as tasty violations — and `--fix` rewrote real
    // `var(--shadow-sm-color)` to `#shadow-sm`, which nothing resolves there, so
    // the browser dropped the declaration.
    const annotated = this.stylesTypeAnnotation(current);

    if (annotated !== null) return annotated;

    // Only `styles` and `*Styles` count. The singular `style` is conventionally
    // a DOM inline-style object (`el.style`, `CSSProperties`, `setStyle(el, …)`)
    // holding raw CSS longhands, not tasty syntax — matching it reported those
    // longhands as tasty violations.
    if (name === 'styles' || name.endsWith('Styles')) {
      // The name is the weakest evidence there is, so let an unmistakable shape
      // overrule it. Without an annotation to go on, a map of named CSS blocks was
      // reported as tasty — `known-property` on every HTML tag name, each block read
      // as a state map — and `--fix` offered rewrites that are only valid inside
      // tasty.
      return !(
        targetNode.type === 'ObjectExpression' && isNamedCssBlockMap(targetNode)
      );
    }

    return false;
  }

  /**
   * Verdict from the declared type: `true` tasty, `false` explicitly not, `null`
   * when there is no annotation to go on and the caller should fall back to the
   * name.
   *
   * A `Styles` reference anywhere in the annotation counts, so wrappers like
   * `Styles | undefined` and `Record<string, Styles>` opt in — while
   * `CSSProperties`, `Record<string, CSSProperties>` and an inline literal of
   * them opt out.
   */
  private stylesTypeAnnotation(
    node: TSESTree.VariableDeclarator,
  ): boolean | null {
    const annotation = node.id.typeAnnotation?.typeAnnotation;

    if (!annotation) return null;

    return referencesStylesType(annotation);
  }

  private getTastyCallContext(
    call: TSESTree.CallExpression,
    targetNode: TSESTree.Node,
  ) {
    const args = call.arguments;

    // tasty({ styles: { ... } }) or tasty(Component, { styles: { ... } })
    const isExtending =
      args.length >= 2 && unwrapExpression(args[0]).type !== 'ObjectExpression';
    const optionsArg = isExtending ? args[1] : args[0];

    if (
      optionsArg?.type === 'ObjectExpression' &&
      this.isInsideStylesProperty(optionsArg, targetNode)
    ) {
      return {
        type: 'tasty' as const,
        isStaticCall: false,
        isSelectorMode: false,
        isExtending,
        baseComponent: isExtending ? baseComponentName(args[0]) : null,
      };
    }

    // Check if inside variants
    if (
      optionsArg?.type === 'ObjectExpression' &&
      this.isInsideVariantsProperty(optionsArg, targetNode)
    ) {
      return {
        type: 'tasty' as const,
        isStaticCall: false,
        isSelectorMode: false,
        isExtending: false,
        baseComponent: null,
      };
    }

    return null;
  }

  private getTastyStaticCallContext(
    call: TSESTree.CallExpression,
    targetNode: TSESTree.Node,
  ) {
    const args = call.arguments;

    // tastyStatic({ ... })
    if (args.length === 1 && args[0] === targetNode) {
      return {
        type: 'tastyStatic' as const,
        isStaticCall: true,
        isSelectorMode: false,
        isExtending: false,
        baseComponent: null,
      };
    }

    // tastyStatic(base, { ... }) or tastyStatic('selector', { ... })
    if (args.length === 2 && args[1] === targetNode) {
      const isSelectorMode = unwrapExpression(args[0]).type === 'Literal';
      return {
        type: 'tastyStatic' as const,
        isStaticCall: true,
        isSelectorMode,
        isExtending: !isSelectorMode,
        baseComponent: isSelectorMode ? null : baseComponentName(args[0]),
      };
    }

    return null;
  }

  private isInsideStylesProperty(
    optionsObj: TSESTree.ObjectExpression,
    targetNode: TSESTree.Node,
  ): boolean {
    for (const prop of optionsObj.properties) {
      if (
        prop.type === 'Property' &&
        prop.key.type === 'Identifier' &&
        prop.key.name === 'styles' &&
        prop.value === targetNode
      ) {
        return true;
      }
    }
    return false;
  }

  private isInsideVariantsProperty(
    optionsObj: TSESTree.ObjectExpression,
    targetNode: TSESTree.Node,
  ): boolean {
    for (const prop of optionsObj.properties) {
      if (
        prop.type === 'Property' &&
        prop.key.type === 'Identifier' &&
        prop.key.name === 'variants' &&
        prop.value.type === 'ObjectExpression'
      ) {
        for (const variantProp of prop.value.properties) {
          if (
            variantProp.type === 'Property' &&
            variantProp.value === targetNode
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Whether this object is a `styles` JSX prop value or a Storybook `args.styles`.
   *
   * Both are unambiguous enough to stand on their own without an import-tracked
   * call or a `styles`-ish variable name. A bare `styles` key elsewhere is not —
   * see the selector list for why.
   */
  isStylesPropertyValue(node: TSESTree.ObjectExpression): boolean {
    const parent = node.parent;

    if (parent?.type === 'Property' && !parent.computed) {
      if (getKeyName(parent.key) !== 'styles') return false;

      // Only inside `args: { … }`.
      const argsObject = parent.parent;
      const argsProperty =
        argsObject?.type === 'ObjectExpression' ? argsObject.parent : undefined;

      return (
        argsProperty?.type === 'Property' &&
        !argsProperty.computed &&
        getKeyName(argsProperty.key) === 'args'
      );
    }

    if (parent?.type === 'JSXExpressionContainer') {
      const attribute = parent.parent;

      return (
        attribute?.type === 'JSXAttribute' &&
        attribute.name.type === 'JSXIdentifier' &&
        attribute.name.name === 'styles'
      );
    }

    return false;
  }

  /**
   * Checks if a property value node is a state mapping object
   * (i.e., an object where keys are state expressions and values are style values).
   */
  isStateMap(
    node: TSESTree.ObjectExpression,
    parentProperty: TSESTree.Property,
  ): boolean {
    const keyName = getKeyName(parentProperty.key);
    if (keyName === null) return false;

    // If the key starts with uppercase, it's a sub-element, not a state map
    if (/^[A-Z]/.test(keyName)) return false;

    // Special keys are not state maps
    // At-rule blocks are not state maps — their object values are descriptor maps.
    if (SPECIAL_STYLE_KEYS.has(keyName)) return false;

    // If the object has keys that look like state expressions, it's a state map.
    // A lone `_` (the fallback floor) or `''` (the default) is enough — both are
    // already covered by the string-literal / identifier branches below.
    return node.properties.some((prop) => {
      if (prop.type !== 'Property') return false;
      if (prop.key.type === 'Literal' && prop.key.value === '') return true;
      if (prop.key.type === 'Identifier') return true;
      if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
        return true;
      }
      return false;
    });
  }

  /**
   * Checks if a key represents a sub-element (starts with uppercase).
   */
  isSubElementKey(key: string): boolean {
    return /^[A-Z]/.test(key);
  }

  /**
   * Checks if a key represents a nested selector (starts with &).
   */
  isNestedSelectorKey(key: string): boolean {
    return key.startsWith('&');
  }

  /**
   * Checks if a key is a custom CSS property definition ($name or $$name).
   */
  isCustomPropertyKey(key: string): boolean {
    return key.startsWith('$');
  }

  /**
   * Checks if a key is a color token definition (#name or ##name).
   */
  isColorTokenKey(key: string): boolean {
    return key.startsWith('#');
  }

  /**
   * Checks if a key is a special @ property (@keyframes, @property, ...).
   */
  isSpecialKey(key: string): boolean {
    return key.startsWith('@');
  }
}
