import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import plugin from '../index.js';
import rule from './no-protected-restyle.js';

const filename = resolve('test/fixtures/protected-components/component.tsx');
const tester = new RuleTester({
  defaultFilenames: { ts: filename, tsx: filename },
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
const tsx = (code: string) => ({ code, filename });
const ui = `import { tasty } from '@tenphi/tasty';\nimport { Button, Card, ComboBox } from '@my-org/ui';\n`;

function prop(name: string, component = "'Button'", source = "'@my-org/ui'") {
  return {
    messageId: 'restyleProp' as const,
    data: { prop: name, component, source },
  };
}
function wrapper(
  name: string,
  component = "'Button'",
  source = "'@my-org/ui'",
) {
  return {
    messageId: 'restyleWrapper' as const,
    data: { prop: name, component, source },
  };
}

tester.run('no-protected-restyle', rule, {
  valid: [
    // Excluded exports are open for styling, through namespaces and members too.
    tsx(`import * as UI from '@my-org/ui';
import { Block, Text, CloseIcon } from '@my-org/ui';
<Block styles={{ fill: '#surface' }} fill="#surface" />;
<Text.Strong styles={{ color: '#text' }} color="#text" />;
<UI.Text preset="t3" />;
<CloseIcon color="#danger" />;`),
    // Semantic props, tokens, mods and callbacks are the customization API.
    tsx(
      ui +
        `<Button type="primary" size="small" theme="danger" mods={{ loading: true }} tokens={{ $gap: '1x' }} onPress={() => {}} />;
<ComboBox filter={(item) => item.visible} prefix={<Icon />} />;`,
    ),
    // Allowed style props place or size the root, as props or as root styles.
    tsx(
      ui +
        `<Button width="100%" gridArea="actions" margin="1x" hide />;
<Button styles={{ width: { '': '100%', '@mobile': 'auto' }, gridArea: 'actions' }} />;
<Button styles={{}} />;`,
    ),
    // Other sources, local components, and a design system's own relative imports.
    tsx(`import { Button } from 'other-lib';
<Button styles={{ fill: '#danger' }} fill="#danger" />;`),
    tsx(`import { tasty } from '@tenphi/tasty';
const Button = tasty({});
<Button styles={{ fill: '#danger' }} fill="#danger" />;`),
    tsx(`import { Button } from './own';
<Button styles={{ fill: '#danger' }} fill="#danger" />;`),
    // Shadowed and type-only bindings are not the protected component.
    tsx(`import { Button } from '@my-org/ui';
function render(Button) { return <Button fill="#danger" />; }`),
    tsx(`import type { Button } from '@my-org/ui';
<Button fill="#danger" />;`),
    tsx(`import { Button } from '@my-org/ui';
let Mutable = Button;
<Mutable fill="#danger" />;`),
    tsx(`import { Button as button } from '@my-org/ui';
<button fill="#danger" />;`),
    // Wrappers that set semantic defaults, tokens or placement pass.
    tsx(
      ui +
        `const CopyButton = tasty(Button, {
  type: 'clear',
  size: 'small',
  tokens: { $gap: '1x' },
  mods: { copy: true },
  styleProps: ['fill'],
  width: '100%',
  styles: { gridArea: 'copy' },
});
tasty(Button, options);
tasty(Text, { styles: { color: '#text' } });
tasty({ styles: { fill: '#danger' } });`,
    ),
    // An entry that names a member path decides for it before its base's entry,
    // including deeper members, aliases and wrappers of it.
    tsx(`import * as UI from '@my-org/ui';
import { tasty } from '@tenphi/tasty';
import { Button, ButtonGroup, Menu } from '@my-org/ui';
const Group = Button.Group;
const Spaced = tasty(Button.Group, { styles: { gap: '2x' } });
<ButtonGroup gap="1x" flow="row" />;
<Button.Group gap="1x" flow="row" />;
<UI.Button.Group gap="1x" />;
<Group placeContent="end" />;
<Button.Group.Item fill="#danger" />;
<Button.Split direction="column" />;
<Menu.Item direction="row" />;
<Menu.Section fill="#danger" />;`),
    // Without protectedComponents, the rule has nothing to check.
    {
      code: `import { Button } from '@my-org/ui';\n<Button styles={{ fill: '#danger' }} />;`,
      filename: resolve('test/fixtures/style-values/component.tsx'),
    },
  ],
  invalid: [
    {
      ...tsx(ui + `<Button styles={{ fill: '#danger' }} />;`),
      errors: [prop('styles')],
    },
    {
      // Any key outside allowedStyleProps, a sub-element, or an opaque value.
      ...tsx(
        ui +
          `<Button styles={{ width: '100%', fill: '#danger' }} />;
<Button styles={{ Label: { color: '#danger' } }} />;
<Button styles={styles} />;
<Button styles={{ ...placement }} />;`,
      ),
      errors: Array(4).fill(prop('styles')),
    },
    {
      ...tsx(
        ui +
          `<ComboBox inputStyles={{ width: '100%' }} triggerStyles={triggerStyles} />;`,
      ),
      errors: [
        prop('inputStyles', "'ComboBox'"),
        prop('triggerStyles', "'ComboBox'"),
      ],
    },
    {
      // Appearance style props, including config.styles and bare booleans.
      ...tsx(
        ui +
          `<Button fill="#danger" color="#white" padding="2x" radius preset="t3" glaze="soft" />;`,
      ),
      errors: ['fill', 'color', 'padding', 'radius', 'preset', 'glaze'].map(
        (name) => prop(name),
      ),
    },
    {
      ...tsx(
        ui + `<Button {...{ styles: overrides, ['fill']: '#danger' }} />;`,
      ),
      errors: [prop('styles'), prop('fill')],
    },
    {
      // Aliases, namespace members, const aliases and sub-components.
      ...tsx(`import * as UI from '@my-org/ui';
import { Button as UIButton, Card } from '@my-org/ui';
const Alias = UIButton;
type Alias = typeof UIButton;
<UIButton fill="#danger" />;
<UI.Button fill="#danger" />;
<Alias fill="#danger" />;
<Card.Header fill="#danger" />;`),
      errors: [
        prop('fill', "'UIButton' (based on 'Button')"),
        prop('fill', "'UI.Button' (based on 'Button')"),
        prop('fill', "'Alias' (based on 'Button')"),
        prop('fill', "'Card.Header' (based on 'Card')"),
      ],
    },
    {
      // A wrapper's instances still restyle the component it wraps.
      ...tsx(
        ui +
          `const CopyButton = tasty(Button, { type: 'clear' });
<CopyButton styles={{ fill: '#danger' }} />;`,
      ),
      errors: [prop('styles', "'CopyButton' (based on 'Button')")],
    },
    {
      ...tsx(
        ui + `const Danger = tasty(Button, { styles: { fill: '#danger' } });`,
      ),
      errors: [wrapper('styles')],
    },
    {
      ...tsx(
        ui +
          `const Fancy = tasty(Button, {
  variants: { fancy: { fill: '#purple' } },
  fill: '#danger',
  inputStyles: { width: '100%' },
  styles: { width: '100%' },
  ...{ color: '#white' },
});`,
      ),
      errors: [
        wrapper('variants'),
        wrapper('fill'),
        wrapper('inputStyles'),
        wrapper('color'),
      ],
    },
    {
      // Wrappers of wrappers.
      ...tsx(
        ui +
          `const CopyButton = tasty(Button, {});
const Danger = tasty(CopyButton, { styles: { fill: '#danger' } });`,
      ),
      errors: [wrapper('styles', "'CopyButton' (based on 'Button')")],
    },
    {
      // Relative re-exports, wrappers and namespace aliases, followed across files.
      ...tsx(`import { Button, Panel, CopyButton, AliasedCard, Dialog } from './barrel';
import Copy from './wrappers';
<Button fill="#danger" />;
<Panel fill="#danger" />;
<CopyButton fill="#danger" />;
<AliasedCard fill="#danger" />;
<Dialog fill="#danger" />;
<Copy fill="#danger" />;`),
      errors: [
        prop('fill'),
        prop('fill', "'Panel' (based on 'Card')"),
        prop('fill', "'CopyButton' (based on 'Button')"),
        prop('fill', "'AliasedCard' (based on 'Card')"),
        prop('fill', "'Dialog'", "'@my-org/strict-ui'"),
        prop('fill', "'Copy' (based on 'Button')"),
      ],
    },
    {
      // A named member follows its own entry; other members follow the base.
      ...tsx(`import { tasty } from '@tenphi/tasty';
import { Button, Menu } from '@my-org/ui';
import { SplitButton } from './wrappers';
<Button.Split fill="#danger" direction="column" />;
<Button.Primary direction="column" />;
<Button gap="1x" />;
<Menu.Item fill="#danger" />;
<Menu fill="#danger" />;
<SplitButton fill="#danger" />;
tasty(Button.Split, { fill: '#danger' });`),
      errors: [
        prop('fill', "'Button.Split'"),
        prop('direction', "'Button.Primary' (based on 'Button')"),
        prop('gap'),
        prop('fill', "'Menu.Item'"),
        prop('fill', "'Menu'"),
        prop('fill', "'SplitButton' (based on 'Button.Split')"),
        wrapper('fill', "'Button.Split'"),
      ],
    },
    {
      // An entry without allowedStyleProps protects placement too.
      ...tsx(`import { Dialog } from '@my-org/strict-ui';
<Dialog width="100%" styles={{ width: '100%' }} />;`),
      errors: [
        prop('width', "'Dialog'", "'@my-org/strict-ui'"),
        prop('styles', "'Dialog'", "'@my-org/strict-ui'"),
      ],
    },
  ],
});

describe('no-protected-restyle messages and configuration', () => {
  const linter = new Linter();
  const config = [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { tasty: plugin },
      rules: { 'tasty/no-protected-restyle': 'warn' as const },
    },
  ];

  it('explains the alternative and the exception path', () => {
    const [message] = linter.verify(
      `import { Button } from '@my-org/ui';\n<Button fill="#danger" />;`,
      config,
      { filename },
    );
    expect(message.message).toBe(
      "'fill' restyles 'Button', a protected '@my-org/ui' component. Customize it through its own props, 'tokens' or 'mods'. If this override is intended, explicitly disable tasty/no-protected-restyle for this usage with an ESLint comment and a reason.",
    );
    expect(message.fix).toBeUndefined();
  });

  it('honours a reasoned disable comment', () => {
    const messages = linter.verify(
      `import { Button } from '@my-org/ui';
// eslint-disable-next-line tasty/no-protected-restyle -- marketing banner needs a custom fill
<Button fill="#brand" />;`,
      config,
      { filename },
    );
    expect(messages).toEqual([]);
  });

  it.each([
    [{ protectedComponents: {} }, /protectedComponents must be an array/],
    [
      { protectedComponents: [{}] },
      /protectedComponents\[0\] must be an object/,
    ],
    [
      { protectedComponents: [{ source: 'ui', exclude: 'Text' }] },
      /protectedComponents\[0\]\.exclude must be an array of strings/,
    ],
  ])('rejects a malformed entry: %j', (tastyConfig, error) => {
    const dir = mkdtempSync(join(tmpdir(), 'tasty-protected-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(
        join(dir, 'tasty.config.json'),
        JSON.stringify(tastyConfig),
      );
      expect(() =>
        new Linter({ cwd: dir }).verify('<Button />;', config, {
          filename: join(dir, 'component.tsx'),
        }),
      ).toThrow(error);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
