import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { resolve } from 'node:path';
import plugin from '../index.js';

const linter = new Linter();
const filename = resolve('test/fixtures/style-values/exceptions.tsx');
const imports = `import { tasty } from '@tenphi/tasty';\nconst Base = tasty({});\n`;
const cases = [
  ['no-raw-color-values', "fill: '#ff0000'"],
  ['no-raw-color-values', "fill: 'rgb(1, 2, 3)'"],
  ['no-raw-color-values', "fill: 'red'"],
  ['consistent-token-usage', "padding: '17px'"],
  ['consistent-token-usage', "padding: '16px'"],
  ['no-raw-transition-duration', "transition: 'fill 0.2s'"],
  ['no-raw-transition-duration', "transition: 'fill (0.2s * 2)'"],
  ['no-raw-motion-duration', "animationDuration: '0.2s'"],
  ['no-runtime-styles-mutation', 'padding: computePadding()'],
  ['no-runtime-styles-mutation', "[generatedKey]: '1x'"],
  ['no-style-spread', '...sharedStyles'],
  ['no-style-spread', '...sharedStyles, ...overrides'],
  ['prefer-shorthand-property', "paddingTop: '1x'"],
  ['prefer-shorthand-property', "paddingTop: '1x'", 'Base, '],
  ['no-state-in-selector', "Body: { $: 'button[disabled]', fill: '#surface' }"],
] as const;

describe('intentional exceptions to advisory rules', () => {
  for (const [rule, property, base = ''] of cases) {
    it(`${rule}: ${property} ${base}gives a local ignore path`, () => {
      const config = [
        {
          files: ['**/*.tsx'],
          languageOptions: { parser },
          plugins: { tasty: plugin },
          rules: { [`tasty/${rule}`]: 'warn' },
        },
      ];
      const call = `tasty(${base}{ styles: {\n${property},\n} });\n`;
      const reported = linter.verify(imports + call, config, { filename });
      expect(reported).toHaveLength(1);
      expect(reported[0].severity).toBe(1);
      expect(reported[0].message).toContain(`explicitly disable tasty/${rule}`);
      expect(reported[0].message).toContain('reason');

      const ignored = call.replace(
        property,
        `// eslint-disable-next-line tasty/${rule} -- required by the integration\n${property}`,
      );
      const source = imports + ignored + call;
      const messages = linter.verify(source, config, { filename });
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe(reported[0].messageId);
      expect(messages[0].line).toBe(source.split('\n').length - 2);
    });
  }
});
