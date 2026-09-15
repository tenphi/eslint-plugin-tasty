import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import plugin, { recommended, strict } from './index.js';

const filename = fileURLToPath(
  new URL('../test/fixtures/style-functions/component.ts', import.meta.url),
);
const imports = `import { defineComponent, resolveComponentStyles } from '@my-org/styling';
import { tasty } from '@tenphi/tasty';\n`;

for (const [preset, rules] of Object.entries({ recommended, strict })) {
  describe(`${preset}: custom style functions`, () => {
    const linter = new Linter();
    const config = {
      files: ['**/*.ts'],
      languageOptions: { parser },
      plugins: { tasty: plugin },
      rules,
    };
    function check(source: string) {
      return linter.verify(imports + source, config, { filename });
    }

    for (const factory of [
      (styles: string) => `defineComponent('Card', { styles: ${styles} });`,
      (styles: string) => `resolveComponentStyles('Card', ${styles});`,
      (styles: string) => `tasty({ styles: ${styles} });`,
    ]) {
      it(`accepts wrapped sub-elements in ${factory('{}')}`, () => {
        expect(
          check(
            factory(`{
          '@active': ':hover',
          Label: ({
            fill: { '': '#clear', '@active': '#white' },
            Icon: ({ fill: '#clear' } as Styles)!,
          } satisfies Styles),
          Disabled: false as const,
        }`),
          ),
        ).toEqual([]);
      });

      it(`still validates wrapped sub-elements in ${factory('{}')}`, () => {
        expect(
          check(factory(`{ Label: { paddding: '1x' } satisfies Styles }`)).map(
            (message) => message.ruleId,
          ),
        ).toEqual(['tasty/known-property']);
        expect(
          check(factory(`{ Label: 'invalid' as const }`)).map(
            (message) => message.ruleId,
          ),
        ).toEqual(['tasty/valid-sub-element']);
      });
    }

    for (const factory of [
      (variants: string) =>
        `defineComponent('Card', { variants: ${variants} });`,
      (variants: string) => `tasty({ variants: ${variants} });`,
    ]) {
      it(`keeps aliases inside variant roots in ${factory('{}')}`, () => {
        expect(
          check(
            factory(`{
          Active: ({
            '@active': ':hover',
            fill: { '': '#clear', '@active': '#white' },
            Label: ({ fill: { '': '#clear', '@active': '#white' } } as Styles),
          } satisfies Styles),
          Idle: { fill: '#clear' },
        }`),
          ),
        ).toEqual([]);

        const errors = check(
          factory(`{
          Active: { '@active': ':hover', fill: '#clear' },
          Idle: { fill: { '': '#clear', '@active': '#white' } },
        }`),
        );
        expect(errors.map((message) => message.ruleId).sort()).toEqual(
          preset === 'strict'
            ? ['tasty/no-unknown-state-alias', 'tasty/valid-state-key']
            : ['tasty/valid-state-key'],
        );
      });

      it(`fixes @own only at the variant root in ${factory('{}')}`, () => {
        const source =
          imports +
          factory(`{
          Active: {
            fill: { '': '#clear', '@own(:hover)': '#white' },
            'Label': ({ fill: { '': '#clear', '@own(:hover)': '#white' } } satisfies Styles),
          },
        }`);
        const fixed = linter.verifyAndFix(source, config, { filename });
        expect(fixed.messages).toEqual([]);
        expect(fixed.output).toBe(source.replace("'@own(:hover)'", "':hover'"));
      });
    }
  });
}
