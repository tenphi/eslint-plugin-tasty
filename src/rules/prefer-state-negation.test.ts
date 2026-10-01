import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-state-negation.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const styles = (key: string) =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { fill: { '': '#white', ${key}: '#blue' } } });`;

tester.run('prefer-state-negation', rule, {
  valid: [
    ...[
      '!:has(~ :not([data-drop-indicator]))',
      ':has(~ :not([data-drop-indicator]))',
      ':is(:not(:hover), :focus)',
      ':where(:not([disabled]))',
      '!:is(Panel, Button)',
      '@parent(:not(:hover))',
      '@root(:not(:hover))',
      '@own(:not(:hover))',
      ':not()',
      ':not(:hover',
      ':not(:hover))',
    ].map((key) => styles(`'${key}'`)),
    `const object = { fill: { ':not(:hover)': 'red' } };`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { content: ':not(:hover)' } });`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic(':not(:hover)', { fill: '#blue' });`,
    styles('[dynamicKey]'),
    styles('[`:not(${dynamic})`]'),
  ],
  invalid: [
    ...[
      [
        ':not(:has(~ :not([data-drop-indicator])))',
        '!:has(~ :not([data-drop-indicator]))',
      ],
      [':not(:hover)', '!:hover'],
      [':not(:unknown-pseudo)', '!:is(:unknown-pseudo)'],
      [':not(:nth-child(2n + 1))', '!:nth-child(2n + 1)'],
      [':not(Panel)', '!:is(Panel)'],
      [':not([data-drop-indicator])', '!:is([data-drop-indicator])'],
      [':not([data-kind="x"])', '!:is([data-kind="x"])'],
      [':not(.active)', '!:is(.active)'],
      [':not(:hover, :focus)', '!:is(:hover, :focus)'],
      [':not(:hover:focus)', '!:is(:hover:focus)'],
      [':not(Panel > Button)', '!:is(Panel > Button)'],
      [':not(:not(:hover))', '!:is(:not(:hover))'],
      [':not(:where(:hover))', '!:is(:where(:hover))'],
      [':not(:is(Panel, Button))', '!:is(:is(Panel, Button))'],
      [
        ':not(:is(:hover, :unknown-pseudo))',
        '!:is(:is(:hover, :unknown-pseudo))',
      ],
      [':not(:is(> Icon))', '!:is(:is(> Icon))'],
      [':not(:is())', '!:is(:is())'],
      [':not(:has(Icon >))', '!:is(:has(Icon >))'],
      [':not(:has(~))', '!:is(:has(~))'],
      [':not(:has(Icon + ))', '!:is(:has(Icon + ))'],
      [
        'hovered & (:not(:hover) | :not(:focus))',
        'hovered & (!:hover | !:focus)',
      ],
      ['  :not( :hover )  ', '  !:hover  '],
      ['!:not(:hover)', '!!:hover'],
    ].map(([input, output]) => ({
      code: styles(`'${input}'`),
      output: styles(`'${output}'`),
      errors: [{ messageId: 'preferStateNegation' as const }],
    })),
    {
      code: styles('":not(:hover)"'),
      output: styles('"!:hover"'),
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles('[`:not(:hover)`]'),
      output: styles('[`!:hover`]'),
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles("[':not(:hover)']"),
      output: styles("['!:hover']"),
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles(String.raw`':not(:ho\u0076er)'`),
      output: null,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles("':not(:hover)': '#red', '!:hover'"),
      output: null,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles("':not(:hover)': '#red', ':not( :hover )'"),
      output: null,
      errors: [
        { messageId: 'preferStateNegation' },
        { messageId: 'preferStateNegation' },
      ],
    },
    {
      code: styles("...baseStates, ':not(:hover)'"),
      output: null,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles("[stateKey]: '#red', ':not(:hover)'"),
      output: null,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: styles("['!:hover']: '#red', ':not(:hover)'"),
      output: null,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ Icon: { fill: { '': '#white', ':not(:hover)': '#blue' } } });`,
      output: `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ Icon: { fill: { '': '#white', '!:hover': '#blue' } } });`,
      errors: [{ messageId: 'preferStateNegation' }],
    },
    {
      code: `import { useStyles } from '@tenphi/tasty'; useStyles({ fill: { '': '#white', ':not(:hover)': '#blue' } });`,
      output: `import { useStyles } from '@tenphi/tasty'; useStyles({ fill: { '': '#white', '!:hover': '#blue' } });`,
      errors: [{ messageId: 'preferStateNegation' }],
    },
  ],
});
