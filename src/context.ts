import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { ResolvedConfig } from './types.js';
import { loadConfig } from './config.js';
import { DEFAULT_IMPORT_SOURCES } from './constants.js';

export interface TastyImport {
  localName: string;
  importedName: string;
  source: string;
}

const TASTY_FUNCTION_NAMES = new Set([
  'tasty',
  'tastyStatic',
  'useStyles',
  'useGlobalStyles',
]);

/**
 * Context tracker for a single file's lint pass.
 * Tracks which imports come from tasty and provides
 * helpers to determine if a node is in a tasty style context.
 */
export class TastyContext {
  readonly config: ResolvedConfig;
  private imports = new Map<string, TastyImport>();
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

  getStyleContext(node: TSESTree.Node): {
    type: 'tasty' | 'tastyStatic' | 'useStyles' | 'useGlobalStyles';
    isStaticCall: boolean;
    isSelectorMode: boolean;
    isExtending: boolean;
  } | null {
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

    if (/styles?$/i.test(current.id.name)) return true;

    if (this.hasStylesTypeAnnotation(current)) return true;

    return false;
  }

  private hasStylesTypeAnnotation(node: TSESTree.VariableDeclarator): boolean {
    const annotation = node.id.typeAnnotation?.typeAnnotation;
    if (!annotation) return false;

    if (
      annotation.type === 'TSTypeReference' &&
      annotation.typeName.type === 'Identifier'
    ) {
      return /^Styles$/i.test(annotation.typeName.name);
    }

    return false;
  }

  private getTastyCallContext(
    call: TSESTree.CallExpression,
    targetNode: TSESTree.Node,
  ) {
    const args = call.arguments;

    // tasty({ styles: { ... } }) or tasty(Component, { styles: { ... } })
    const optionsArg =
      args.length >= 2 && args[0].type !== 'ObjectExpression'
        ? args[1]
        : args[0];

    if (
      optionsArg?.type === 'ObjectExpression' &&
      this.isInsideStylesProperty(optionsArg, targetNode)
    ) {
      return {
        type: 'tasty' as const,
        isStaticCall: false,
        isSelectorMode: false,
        isExtending: args.length >= 2 && args[0].type !== 'ObjectExpression',
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
      };
    }

    // tastyStatic(base, { ... }) or tastyStatic('selector', { ... })
    if (args.length === 2 && args[1] === targetNode) {
      const isSelectorMode = args[0].type === 'Literal';
      return {
        type: 'tastyStatic' as const,
        isStaticCall: true,
        isSelectorMode,
        isExtending: !isSelectorMode,
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
   * Checks if a property value node is a state mapping object
   * (i.e., an object where keys are state expressions and values are style values).
   */
  isStateMap(
    node: TSESTree.ObjectExpression,
    parentProperty: TSESTree.Property,
  ): boolean {
    const key = parentProperty.key;
    if (key.type !== 'Identifier') return false;

    // If the key starts with uppercase, it's a sub-element, not a state map
    if (/^[A-Z]/.test(key.name)) return false;

    // Special keys are not state maps
    if (key.name === '@keyframes' || key.name === '@properties') return false;

    // If the object has keys that look like state expressions, it's a state map
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
   * Checks if a key is a special @ property (@keyframes, @properties).
   */
  isSpecialKey(key: string): boolean {
    return key.startsWith('@');
  }
}
