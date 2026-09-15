import { fileURLToPath } from 'node:url';
import { RuleTester } from '@typescript-eslint/rule-tester';
import noImportant from './rules/no-important.js';
import knownProperty from './rules/known-property.js';
import requireDefaultState from './rules/require-default-state.js';
import preferShorthand from './rules/prefer-shorthand-property.js';

const filename = fileURLToPath(
  new URL('../test/fixtures/style-functions/component.ts', import.meta.url),
);
const tester = new RuleTester({
  defaultFilenames: { ts: filename, tsx: filename.replace(/ts$/, 'tsx') },
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});
const imports = `import { defineComponent, resolveComponentStyles, mergeStyles, extendComponent } from '@my-org/styling';\n`;

tester.run('custom style functions: detection and fixes', noImportant, {
  valid: [
    // No name-only detection, and no inference through unconfigured modules.
    `defineComponent('Card', { styles: { fill: 'red !important' } });`,
    `import { defineComponent } from 'unrelated'; defineComponent('Card', { styles: { fill: 'red !important' } });`,
    `import { anotherHelper } from '@my-org/styling'; anotherHelper({ fill: 'red !important' });`,
    `import type { defineComponent } from '@my-org/styling'; defineComponent('Card', { styles: { fill: 'red !important' } });`,
    `import { type defineComponent } from '@my-org/styling'; defineComponent('Card', { styles: { fill: 'red !important' } });`,
    `import defineComponent from '@my-org/styling'; defineComponent('Card', { styles: { fill: 'red !important' } });`,
    // Namespace calls are not named imports.
    `import * as styling from '@my-org/styling'; styling.defineComponent('Card', { styles: { fill: 'red !important' } });`,
    // The import must still be the binding at the call site.
    imports +
      `function render(defineComponent) { defineComponent('Card', { styles: { fill: 'red !important' } }); }`,
    imports +
      `{ const defineComponent = other; defineComponent('Card', { styles: { fill: 'red !important' } }); }`,
    // Only the configured argument and shape are styles.
    imports + `defineComponent({ styles: { fill: 'red !important' } }, {});`,
    imports +
      `defineComponent('Card', { fill: 'red !important', props: { fill: 'red !important' } });`,
    imports +
      `defineComponent('Card', { [styles]: { fill: 'red !important' } });`,
    imports +
      `defineComponent('Card', { styles: unrelated({ fill: 'red !important' }) });`,
    imports +
      `resolveComponentStyles({ fill: 'red !important' }, {}, { fill: 'red !important' });`,
    imports +
      `resolveComponentStyles('Card', { metadata: { nested: { fill: 'red !important' } } });`,
    imports +
      `defineComponent('Card'); resolveComponentStyles(); mergeStyles(...others);`,
    // The fixture attempts to override tasty's signature; built-ins win.
    `import { tasty } from '@tenphi/tasty'; tasty(Base, {}, { fill: 'red !important' });`,
  ],
  invalid: [
    ...[
      `defineComponent('Card', { styles: { fill: 'red !important' } });`,
      `defineComponent('Card', { variants: { active: { fill: 'red !important' } } });`,
      `defineComponent('Card', { variants: { Active: { fill: 'red !important' } } });`,
      `defineComponent('Card', { styles: { Label: { Icon: { fill: 'red !important' } } } });`,
      `defineComponent('Card', { styles: { fill: { '': 'red', hovered: 'blue !important' } } });`,
      `defineComponent('Card', { 'styles': { fill: 'red !important' } as Styles } satisfies Options);`,
      `defineComponent('Card', { 'variants': { Active: { fill: 'red !important' } as Styles } as Variants });`,
      `defineComponent('Card', { styles: { Label: ({ fill: 'red !important' } satisfies Styles) } });`,
      `resolveComponentStyles('Card', { fill: 'red !important' });`,
      `resolveComponentStyles('Card', ({ Label: { fill: 'red !important' } } as const)!);`,
      `defineComponent('Card', { styles: resolveComponentStyles('Card', { fill: 'red !important' }) });`,
      `mergeStyles(base, { fill: 'red !important' }, other);`,
      `mergeStyles({ fill: 'red !important' }, base, other);`,
      `(defineComponent as Factory)('Card', { styles: { fill: 'red !important' } });`,
    ].map((code) => ({
      code: imports + code,
      output: imports + code.replace(' !important', ''),
      errors: [{ messageId: 'noImportant' as const }],
    })),
    {
      code:
        imports +
        `mergeStyles({ fill: 'red !important' }, { color: 'blue !important' });`,
      output: imports + `mergeStyles({ fill: 'red' }, { color: 'blue' });`,
      errors: [{ messageId: 'noImportant' }, { messageId: 'noImportant' }],
    },
    {
      code: `import { defineComponent as component } from '@my-org/styling'; component('Card', { styles: { fill: 'red !important' } });`,
      output: `import { defineComponent as component } from '@my-org/styling'; component('Card', { styles: { fill: 'red' } });`,
      errors: [{ messageId: 'noImportant' }],
    },
    {
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { fill: 'red !important' } });`,
      output: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { fill: 'red' } });`,
      errors: [{ messageId: 'noImportant' }],
    },
  ],
});

tester.run('custom style functions: options are not styles', knownProperty, {
  valid: [
    imports +
      `defineComponent('Card', { as: 'section', styles: { fill: '#surface' }, variants: { active: { fill: '#active' } } });`,
  ],
  invalid: [
    {
      code:
        imports +
        `defineComponent('Card', { styles: { paddding: '1x' }, variants: { active: { paddding: '2x' } } });`,
      errors: [
        { messageId: 'unknownProperty' },
        { messageId: 'unknownProperty' },
      ],
    },
  ],
});

tester.run('custom style functions: partial overrides', requireDefaultState, {
  valid: [
    imports + `mergeStyles(base, { fill: { hovered: '#active' } });`,
    imports +
      `extendComponent(Base, { styles: { Label: { fill: { hovered: '#active' } } } });`,
  ],
  invalid: [
    ...[
      `defineComponent('Card', { styles: { fill: { hovered: '#active' } } });`,
      `resolveComponentStyles('Card', { fill: { hovered: '#active' } });`,
      // Variants are independent style definitions, as in tasty(Base, options).
      `extendComponent(Base, { variants: { active: { fill: { hovered: '#active' } } } });`,
    ].map((code) => ({
      code: imports + code,
      errors: [{ messageId: 'missingDefaultState' as const }],
    })),
  ],
});

tester.run('custom style functions: safe shorthand fixes', preferShorthand, {
  valid: [],
  invalid: [
    {
      code:
        imports +
        `defineComponent('Card', { styles: { backgroundColor: '#surface' } });`,
      output:
        imports + `defineComponent('Card', { styles: { fill: '#surface' } });`,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: imports + `mergeStyles(base, { backgroundColor: '#surface' });`,
      output: null,
      errors: [{ messageId: 'preferShorthandExtending' }],
    },
  ],
});
