import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-raw-motion-duration.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const wrap = (styles: string) => `
  import { tasty } from '@tenphi/tasty';
  tasty({ styles: { ${styles} } });
`;

tester.run('no-raw-motion-duration', rule, {
  valid: [
    wrap(`animation: 'pulse $modal-duration infinite'`),
    wrap(`animation: 'pulse 0s 200ms'`),
    wrap(`animation: 'pulse 0 200ms'`),
    wrap(`animation: 'pulse var(--animation-duration) 200ms'`),
    wrap(`animation: 'pulse calc(var(--animation-duration) * 2) 200ms'`),
    wrap(`animation: 'pulse steps(4, end) $modal-duration'`),
    wrap(`animationDuration: '$modal-duration'`),
    wrap(`transitionDuration: '$transition'`),
    wrap(`transitionDelay: '200ms'`),
    wrap(`animationDelay: '200ms'`),
    wrap(`opacity: 0.5, zIndex: 10, gap: '2x', border: '1bw solid #line'`),
    `const styles: CSSProperties = { animation: 'pulse 200ms' };`,
  ],
  invalid: [
    {
      code: wrap(`animation: 'pulse 200ms ease-in 100ms'`),
      errors: [{ messageId: 'rawMotionDuration', suggestions: [] }],
    },
    {
      code: wrap(`animation: '200ms pulse, spin steps(4, end) 1s'`),
      errors: [
        { messageId: 'rawMotionDuration', suggestions: [] },
        { messageId: 'rawMotionDuration', suggestions: [] },
      ],
    },
    {
      code: wrap(`animation: 'pulse calc(200ms * 2)'`),
      errors: [{ messageId: 'rawMotionDuration', suggestions: [] }],
    },
    {
      code: wrap(`animationDuration: { '': '300ms', hovered: '0s' }`),
      errors: [{ messageId: 'rawMotionDuration', suggestions: [] }],
    },
    {
      code: wrap(`transitionDuration: '200ms'`),
      errors: [
        {
          messageId: 'rawMotionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              output: wrap(`transitionDuration: '$transition'`),
            },
          ],
        },
      ],
    },
    {
      filename: 'test/fixtures/duration-tokens/component.tsx',
      code: wrap(`animation: 'pulse 200ms'`),
      errors: [
        {
          messageId: 'rawMotionDuration',
          suggestions: [
            {
              messageId: 'useDurationToken',
              output: wrap(`animation: 'pulse $modal-duration'`),
            },
          ],
        },
      ],
    },
  ],
});
