import { RuleTester } from '@typescript-eslint/rule-tester';
import knownProperty from './rules/known-property.js';
import validBooleanProperty from './rules/valid-boolean-property.js';
import validDirectionalModifier from './rules/valid-directional-modifier.js';
import preferShorthandProperty from './rules/prefer-shorthand-property.js';
import {
  KNOWN_TASTY_PROPERTIES,
  LOGICAL_BORDER_STYLES,
  LOGICAL_SIZE_CONSTRAINT_STYLES,
  LOGICAL_SPACING_STYLES,
  LOGICAL_STYLES,
  SHORTHAND_MAPPING,
} from './constants.js';
import { getExpectation } from './property-expectations.js';

/**
 * Cross-rule coverage for tasty v3.8's enhanced logical styles.
 *
 * The feature is one style family that every property-keyed rule reads through
 * a different constant, so a per-rule test file would spread eighteen property
 * names across five places and still leave the interesting question — do the
 * constants agree with each other? — untested. This file asks that directly,
 * then pins the behaviour each rule owes the family.
 *
 * Mirrors `@tenphi/tasty`'s `src/styles/logical.test.ts` and `logical-list.ts`.
 */

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const wrap = (styles: string) => `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${styles} } });
      `;

describe('logical style catalogue', () => {
  it('recognises every enhanced logical style as a tasty property', () => {
    for (const style of LOGICAL_STYLES) {
      expect(KNOWN_TASTY_PROPERTIES, style).toContain(style);
    }
  });

  it('covers the eighteen names tasty v3.8 added', () => {
    // Spelled out rather than derived, so a name dropped from the groups above
    // fails here instead of quietly narrowing every rule that reads them.
    expect([...LOGICAL_STYLES].sort()).toEqual(
      [
        'blockBorder',
        'blockInset',
        'blockMargin',
        'blockPadding',
        'blockScrollMargin',
        'blockScrollPadding',
        'blockSize',
        'inlineBorder',
        'inlineInset',
        'inlineMargin',
        'inlinePadding',
        'inlineScrollMargin',
        'inlineScrollPadding',
        'inlineSize',
        'maxBlockSize',
        'maxInlineSize',
        'minBlockSize',
        'minInlineSize',
      ].sort(),
    );
  });

  it('gives every style with a modifier vocabulary an expectation entry', () => {
    // A missing entry silently falls back to PASSTHROUGH, which accepts any
    // modifier — the one failure mode that looks like the rule working.
    for (const style of [...LOGICAL_SPACING_STYLES, ...LOGICAL_BORDER_STYLES]) {
      const { acceptsMods } = getExpectation(style);

      expect(Array.isArray(acceptsMods), style).toBe(true);
    }
  });

  it('leaves the min/max size constraints on passthrough, as width does', () => {
    // `minWidth`/`maxWidth` carry no expectation entry either: they take a bare
    // value, and the shorthand (`blockSize: 'min 2x'`) is where the `min`/`max`
    // modifiers live. Tightening one axis and not the other would be the drift.
    for (const style of LOGICAL_SIZE_CONSTRAINT_STYLES) {
      expect(getExpectation(style), style).toEqual(getExpectation('minWidth'));
    }
  });

  it('leaves the native CSS spellings to the CSS property list', () => {
    // Tasty 3.8 stopped reading these in its physical handlers, so they are
    // ordinary CSS declarations now and `prefer-shorthand-property` points them
    // at the enhanced style.
    for (const native of [
      'paddingBlock',
      'paddingInline',
      'insetBlock',
      'insetInline',
      'marginBlock',
      'marginInline',
    ]) {
      expect(KNOWN_TASTY_PROPERTIES, native).not.toContain(native);
      expect(SHORTHAND_MAPPING[native], native).toBeDefined();
    }
  });
});

tester.run('known-property (logical styles)', knownProperty, {
  valid: [
    wrap(`blockPadding: '1x start, 2x end'`),
    wrap(`inlinePadding: '2x'`),
    wrap(`blockMargin: '1x', inlineMargin: '2x'`),
    wrap(`blockInset: '0 end'`),
    wrap(`inlineInset: 'auto start'`),
    wrap(`blockScrollMargin: '1x', inlineScrollMargin: '1x'`),
    wrap(`blockScrollPadding: '1x', inlineScrollPadding: '1x'`),
    wrap(`blockBorder: '1bw solid #accent start'`),
    wrap(`inlineBorder: true`),
    wrap(`blockSize: '1x 10x'`),
    wrap(`inlineSize: 'min 2x'`),
    wrap(`minBlockSize: '2x', maxBlockSize: '10x'`),
    wrap(`minInlineSize: '2x', maxInlineSize: '10x'`),

    // Native logical CSS stays valid — as a CSS property, not a tasty one.
    wrap(`paddingInlineStart: '1x'`),
    wrap(`borderStartStartRadius: '1r'`),
    wrap(`writingMode: 'vertical-rl', direction: 'rtl'`),
  ],
  invalid: [
    {
      // The axis and the category are not interchangeable in either order.
      code: wrap(`paddingBlockLogical: '1x'`),
      errors: [{ messageId: 'unknownProperty' }],
    },
    {
      code: wrap(`blockPading: '1x'`),
      errors: [{ messageId: 'unknownProperty' }],
    },
  ],
});

tester.run('valid-boolean-property (logical styles)', validBooleanProperty, {
  valid: [
    // `true` means "the design-system default" for every logical category:
    // `1x` for spacing and scroll edges, `0` for inset, `1bw` for border.
    ...LOGICAL_STYLES.map((style) => wrap(`${style}: true`)),
    wrap(`scrollMargin: true, scrollPadding: true`),
  ],
  invalid: [
    {
      // Native logical CSS gets no category default, so `true` is meaningless.
      code: wrap(`paddingInlineStart: true`),
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
    {
      code: wrap(`writingMode: true`),
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
  ],
});

tester.run(
  'valid-directional-modifier (logical styles)',
  validDirectionalModifier,
  {
    valid: [
      wrap(`blockPadding: '1x start'`),
      wrap(`inlinePadding: '1x start, 2x end'`),
      wrap(`blockMargin: '2x end'`),
      wrap(`inlineInset: '0 start'`),
      wrap(`blockScrollPadding: '1x end'`),

      // A group naming no edge keeps start/end order, so two values are fine.
      wrap(`blockPadding: '1x 2x'`),
      wrap(`inlineInset: 'auto 0'`),

      // The `longhand` output modifier emits the two native declarations.
      wrap(`blockPadding: '1x start longhand'`),

      // A border group legitimately carries width + style + colour, exactly as
      // the physical `border` does.
      wrap(`blockBorder: '1bw solid #accent start'`),
      wrap(`inlineBorder: '1bw solid #accent start, 0 end'`),
    ],
    invalid: [
      {
        // A physical side on a logical axis: the handler drops it silently.
        code: wrap(`blockPadding: '1x top'`),
        errors: [{ messageId: 'invalidDirectionalModifier' }],
      },
      {
        code: wrap(`inlineBorder: '1bw solid left'`),
        errors: [{ messageId: 'invalidDirectionalModifier' }],
      },
      {
        // And the mirror image: a logical edge on a physical property.
        code: wrap(`padding: '1x start'`),
        errors: [{ messageId: 'invalidDirectionalModifier' }],
      },
      {
        code: wrap(`inset: '0 end'`),
        errors: [{ messageId: 'invalidDirectionalModifier' }],
      },
      {
        // One value per group that names an edge — per-edge values come from
        // comma groups, since values and modifiers are bucketed separately.
        code: wrap(`blockPadding: '1x 2x start'`),
        errors: [{ messageId: 'tooManyValues' }],
      },
      {
        code: wrap(`inlineScrollMargin: '1x 2x end'`),
        errors: [{ messageId: 'tooManyValues' }],
      },
      {
        // `scrollPadding` gained a directional handler in 3.8 and now answers
        // to the same arity rule as `scrollMargin`.
        code: wrap(`scrollPadding: '1x 2x top'`),
        errors: [{ messageId: 'tooManyValues' }],
      },
    ],
  },
);

tester.run(
  'prefer-shorthand-property (logical styles)',
  preferShorthandProperty,
  {
    valid: [
      wrap(`blockPadding: '1x'`),
      wrap(`inlineBorder: '1bw solid #accent'`),
      wrap(`blockSize: 'min 2x'`),

      // Logical radius has no enhanced counterpart — `radius` is physical, so
      // pointing a logical corner at it would be wrong advice.
      wrap(`borderStartStartRadius: '1r'`),
    ],
    invalid: [
      {
        // The axis shorthands rename cleanly: `padding-block: 1x 2x` is what
        // both keys emit, so the fix is applied.
        code: wrap(`paddingBlock: '1x 2x'`),
        output: wrap(`blockPadding: '1x 2x'`),
        errors: [{ messageId: 'preferShorthand' }],
      },
      {
        code: wrap(`insetInline: '0'`),
        output: wrap(`inlineInset: '0'`),
        errors: [{ messageId: 'preferShorthand' }],
      },
      {
        // An edge longhand needs a `start`/`end` modifier added to the value,
        // so it is reported without a fix.
        code: wrap(`paddingInlineStart: '1x'`),
        output: null,
        errors: [{ messageId: 'preferShorthand' }],
      },
      {
        // `border-block: 1bw` renders nothing — the rename also gains the
        // style/colour defaults, so it stays report-only.
        code: wrap(`borderBlock: '1bw'`),
        output: null,
        errors: [{ messageId: 'preferShorthand' }],
      },
      {
        code: wrap(`borderInlineColor: '#accent'`),
        output: null,
        errors: [{ messageId: 'preferShorthand' }],
      },
      {
        code: wrap(`minBlockSize: '2x'`),
        output: null,
        errors: [{ messageId: 'preferShorthand' }],
      },
    ],
  },
);
