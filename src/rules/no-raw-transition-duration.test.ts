import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-raw-transition-duration.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const wrap = (styles: string) => `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${styles} } });
      `;

// A path inside a directory whose tasty.config.json lists duration tokens. The
// file itself need not exist — only the config the loader walks up to does.
const TOKENS_FIXTURE = 'test/fixtures/duration-tokens/component.tsx';

// `$transition` shows up in every case, fixture or not: `@tenphi/tasty` ships a
// `tasty.config.ts` listing it and the loader reads that as the base of the
// config chain. So the rule always has at least one token to name — the advice
// is never "use a token" with no token to point at.

tester.run('no-raw-transition-duration', rule, {
  valid: [
    // No duration at all: tasty substitutes `var(--fill-transition,
    // var(--transition))`, which is the form this rule is steering toward.
    wrap(`transition: 'fill'`),
    wrap(`transition: 'theme'`),
    wrap(`transition: 'fill, radius, shadow'`),

    // Easing without a duration is explicitly supported.
    wrap(`transition: 'fill ease-in'`),
    wrap(`transition: 'radius ease-in-out'`),

    // Already a token, in either spelling.
    wrap(`transition: 'fill $transition'`),
    wrap(`transition: 'fill $fast-transition ease-in'`),
    wrap(`transition: 'fill var(--transition)'`),

    // A duration derived from a token is somebody using the token, not
    // hardcoding a number.
    wrap(`transition: 'fill (0.2s * 2)'`),
    wrap(`transition: 'fill calc(var(--transition) * 2)'`),

    // The third slot is a *delay*. Omitting one means "no delay", a real
    // rendering change, so the advice this rule gives would not hold.
    wrap(`transition: 'fill ease-in 0.1s'`),
    wrap(`transition: 'fill ease 100ms'`),

    // A multi-argument easing's commas are not group separators. The last
    // fragment of the naive split is `1) 1s`, which the name guard drops
    // instead of reporting a duration for a property called `1)`.
    wrap(`transition: 'fill cubic-bezier(0.4, 0, 0.2, 1) 1s'`),
    wrap(`transition: 'fill steps(4, end) 1s'`),

    // A CSS-wide keyword carries no duration.
    wrap(`transition: 'inherit'`),

    // Only the `transition` key is inspected — `animation` shorthand durations
    // are a different vocabulary with no token fallback.
    wrap(`animation: 'spin 0.2s linear'`),

    // A dynamic value is not a static string, so there is nothing to read.
    'import { tasty } from "@tenphi/tasty";\nconst d = "0.2s";\ntasty({ styles: { transition: `fill ${d}` } });',

    // React inline styles, not tasty. The variable name said `styles`; the type
    // says otherwise, and the type wins — there is no `--transition` to inherit
    // here, so the advice would be wrong.
    `
        import { tasty } from '@tenphi/tasty';
        const styles: { wrapper: CSSProperties } = {
          wrapper: { transition: 'background-color 0.2s' },
        };
      `,
  ],
  invalid: [
    {
      code: wrap(`transition: 'fill 0.2s'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(`transition: 'fill $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill'`),
            },
          ],
        },
      ],
    },
    {
      code: wrap(`transition: 'theme 200ms'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '200ms', token: '$transition' },
              output: wrap(`transition: 'theme $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'theme'`),
            },
          ],
        },
      ],
    },
    {
      // Removal takes the separating whitespace with it, so the easing does not
      // end up double-spaced.
      code: wrap(`transition: 'fill 0.2s ease-in'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(`transition: 'fill $transition ease-in'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill ease-in'`),
            },
          ],
        },
      ],
    },
    {
      // A bare `0` is still a hardcoded duration — and "no transition" is
      // better expressed as a state than as a zero.
      code: wrap(`transition: 'fill 0'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0', token: '$transition' },
              output: wrap(`transition: 'fill $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill'`),
            },
          ],
        },
      ],
    },
    {
      // One report per comma group, each with its own offsets.
      code: wrap(`transition: 'fill 0.2s, radius 0.3s'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(`transition: 'fill $transition, radius 0.3s'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill, radius 0.3s'`),
            },
          ],
        },
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.3s', token: '$transition' },
              output: wrap(`transition: 'fill 0.2s, radius $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill 0.2s, radius'`),
            },
          ],
        },
      ],
    },
    {
      // A custom-property transition has no per-name timing token, so the
      // message points at the global one.
      code: wrap(`transition: '$$custom-prop 0.3s'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          data: {
            duration: '0.3s',
            available: ' ($transition)',
            fallback: '$transition',
          },
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.3s', token: '$transition' },
              output: wrap(`transition: '$$custom-prop $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: '$$custom-prop'`),
            },
          ],
        },
      ],
    },
    {
      // A state map inherits the outer property's parsing.
      code: wrap(`transition: { '': 'fill 0.2s', hovered: 'fill 0.1s' }`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(
                `transition: { '': 'fill $transition', hovered: 'fill 0.1s' }`,
              ),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: { '': 'fill', hovered: 'fill 0.1s' }`),
            },
          ],
        },
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.1s', token: '$transition' },
              output: wrap(
                `transition: { '': 'fill 0.2s', hovered: 'fill $transition' }`,
              ),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: { '': 'fill 0.2s', hovered: 'fill' }`),
            },
          ],
        },
      ],
    },
    {
      // A sub-element is a style object in its own right.
      code: wrap(`Icon: { transition: 'fill 0.2s' }`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(`Icon: { transition: 'fill $transition' }`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`Icon: { transition: 'fill' }`),
            },
          ],
        },
      ],
    },
    {
      // So is a variant.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ variants: { big: { transition: 'fill 0.2s' } } });
      `,
      errors: [
        {
          messageId: 'rawTransitionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ variants: { big: { transition: 'fill $transition' } } });
      `,
            },
            {
              messageId: 'useDefaultDuration',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ variants: { big: { transition: 'fill' } } });
      `,
            },
          ],
        },
      ],
    },
    {
      // Unit case is not significant.
      code: wrap(`transition: 'fill 0.2S'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          data: {
            duration: '0.2S',
            available: ' ($transition)',
            fallback: '$fill-transition (falling back to $transition)',
          },
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2S', token: '$transition' },
              output: wrap(`transition: 'fill $transition'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill'`),
            },
          ],
        },
      ],
    },
    {
      // An escape means the raw text and the cooked value have different
      // offsets, so no edit can be placed safely. The report still stands —
      // it just carries no suggestion, rather than a mis-aimed one.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'fill\\u00200.2s' } });
      `,
      errors: [{ messageId: 'rawTransitionDuration', suggestions: [] }],
    },
    {
      // With duration tokens in the project config, each is offered as a
      // suggestion ahead of removal — naming the project's own duration is
      // better advice than deleting the author's intent. `$gap` and `#primary`
      // are in the same list and correctly excluded.
      filename: TOKENS_FIXTURE,
      code: wrap(`transition: 'fill 0.2s'`),
      errors: [
        {
          messageId: 'rawTransitionDuration',
          data: {
            duration: '0.2s',
            available: ' ($transition, $fast-transition, $modal-duration)',
            fallback: '$fill-transition (falling back to $transition)',
          },
          suggestions: [
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$transition' },
              output: wrap(`transition: 'fill $transition'`),
            },
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$fast-transition' },
              output: wrap(`transition: 'fill $fast-transition'`),
            },
            {
              messageId: 'useDurationToken',
              data: { duration: '0.2s', token: '$modal-duration' },
              output: wrap(`transition: 'fill $modal-duration'`),
            },
            {
              messageId: 'useDefaultDuration',
              output: wrap(`transition: 'fill'`),
            },
          ],
        },
      ],
    },
  ],
});
