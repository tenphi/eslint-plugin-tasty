/**
 * Per-property expectations for parser bucket validation.
 *
 * After parsing a value through StyleParser.process(), each group contains
 * `colors`, `values`, and `mods` arrays. This map defines what is expected
 * for each tasty property so we can flag unexpected tokens.
 *
 * - `acceptsColor`: whether Color bucket tokens are valid
 * - `acceptsMods`: whether Mod bucket tokens are valid, and if so which ones
 *   - `false` = no mods accepted (any mod is an error)
 *   - `true` = any mod accepted (pass-through)
 *   - `string[]` = only these specific mods are accepted
 *
 * Properties NOT listed here default to PASSTHROUGH (accept everything).
 * Only add properties that have actual restrictions.
 */

export interface PropertyExpectation {
  acceptsColor: boolean;
  acceptsMods: boolean | string[];
}

const DIRECTIONAL_MODS = ['top', 'right', 'bottom', 'left'];
// Output modifier accepted by every box property (`padding`, `margin`,
// `inset`, `border`, `radius`): emit the individual CSS longhands instead of
// the shorthand, so children can selectively inherit a single side/corner.
const LONGHAND_MOD = 'longhand';
// `inset` additionally accepts `dock`: pin one edge and span its full
// length (tasty >= 2.10). Other directional properties do not.
const INSET_MODS = [...DIRECTIONAL_MODS, 'dock', LONGHAND_MOD];
const BOX_DIRECTIONAL_MODS = [...DIRECTIONAL_MODS, LONGHAND_MOD];
const RADIUS_DIRECTIONAL_MODS = [
  ...DIRECTIONAL_MODS,
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  LONGHAND_MOD,
];
const BORDER_STYLE_MODS = [
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
  'hidden',
];
const DIMENSION_MODS = ['min', 'max', 'fixed'];
// The logical axis handlers take `start`/`end` in place of the four physical
// sides, plus the same `longhand` output modifier — it emits the two native
// start/end declarations instead of the axis shorthand.
const LOGICAL_EDGE_MODS = ['start', 'end', LONGHAND_MOD];
const FLOW_MODS = [
  'row',
  'column',
  'wrap',
  'nowrap',
  'dense',
  'row-reverse',
  'column-reverse',
];
const OVERFLOW_MODS = [
  'visible',
  'hidden',
  'scroll',
  'clip',
  'auto',
  'overlay',
];
const POSITION_MODS = ['static', 'relative', 'absolute', 'fixed', 'sticky'];

const COLOR_ONLY: PropertyExpectation = {
  acceptsColor: true,
  acceptsMods: false,
};

const VALUE_ONLY: PropertyExpectation = {
  acceptsColor: false,
  acceptsMods: false,
};

const PASSTHROUGH: PropertyExpectation = {
  acceptsColor: true,
  acceptsMods: true,
};

export const PROPERTY_EXPECTATIONS: Record<string, PropertyExpectation> = {
  fill: { acceptsColor: true, acceptsMods: ['none', 'transparent'] },
  color: { acceptsColor: true, acceptsMods: ['none', 'transparent'] },
  caretColor: COLOR_ONLY,
  accentColor: COLOR_ONLY,
  shadow: { acceptsColor: true, acceptsMods: ['inset'] },

  border: {
    acceptsColor: true,
    acceptsMods: [...BOX_DIRECTIONAL_MODS, ...BORDER_STYLE_MODS],
  },
  outline: {
    acceptsColor: true,
    acceptsMods: BORDER_STYLE_MODS,
  },

  radius: {
    acceptsColor: false,
    acceptsMods: [
      ...RADIUS_DIRECTIONAL_MODS,
      'round',
      'ellipse',
      'leaf',
      'backleaf',
    ],
  },

  padding: { acceptsColor: false, acceptsMods: BOX_DIRECTIONAL_MODS },
  margin: { acceptsColor: false, acceptsMods: BOX_DIRECTIONAL_MODS },
  fade: { acceptsColor: true, acceptsMods: DIRECTIONAL_MODS },
  inset: { acceptsColor: false, acceptsMods: INSET_MODS },
  scrollMargin: { acceptsColor: false, acceptsMods: BOX_DIRECTIONAL_MODS },
  scrollPadding: { acceptsColor: false, acceptsMods: BOX_DIRECTIONAL_MODS },

  // Native logical CSS shorthands. Tasty v3.8 stopped reading these in its
  // physical handlers, so they are ordinary CSS declarations now: one or two
  // lengths through the normal value parser, no colours and no modifiers. The
  // enhanced `blockPadding` / `inlinePadding` below are what take modifiers.
  paddingInline: VALUE_ONLY,
  paddingBlock: VALUE_ONLY,

  width: { acceptsColor: false, acceptsMods: DIMENSION_MODS },
  height: { acceptsColor: false, acceptsMods: DIMENSION_MODS },

  // Enhanced logical styles. Each axis/category pair mirrors its physical
  // counterpart's vocabulary with `start`/`end` in place of the four sides.
  blockPadding: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  inlinePadding: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  blockMargin: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  inlineMargin: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  blockInset: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  inlineInset: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  blockScrollMargin: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  inlineScrollMargin: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  blockScrollPadding: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  inlineScrollPadding: { acceptsColor: false, acceptsMods: LOGICAL_EDGE_MODS },
  blockBorder: {
    acceptsColor: true,
    acceptsMods: [...LOGICAL_EDGE_MODS, ...BORDER_STYLE_MODS],
  },
  inlineBorder: {
    acceptsColor: true,
    acceptsMods: [...LOGICAL_EDGE_MODS, ...BORDER_STYLE_MODS],
  },
  blockSize: { acceptsColor: false, acceptsMods: DIMENSION_MODS },
  inlineSize: { acceptsColor: false, acceptsMods: DIMENSION_MODS },

  gap: VALUE_ONLY,
  columnGap: VALUE_ONLY,
  rowGap: VALUE_ONLY,
  flexBasis: VALUE_ONLY,
  flexGrow: VALUE_ONLY,
  flexShrink: VALUE_ONLY,
  flex: VALUE_ONLY,
  order: VALUE_ONLY,
  zIndex: VALUE_ONLY,
  opacity: VALUE_ONLY,
  aspectRatio: VALUE_ONLY,
  lineClamp: VALUE_ONLY,
  tabSize: VALUE_ONLY,

  flow: { acceptsColor: false, acceptsMods: FLOW_MODS },
  display: {
    acceptsColor: false,
    acceptsMods: [
      'block',
      'inline',
      'inline-block',
      'flex',
      'inline-flex',
      'grid',
      'inline-grid',
      'none',
      'contents',
      'table',
      'table-row',
      'table-cell',
      'list-item',
    ],
  },
  overflow: { acceptsColor: false, acceptsMods: OVERFLOW_MODS },
  position: { acceptsColor: false, acceptsMods: POSITION_MODS },
};

/**
 * Get expectations for a property. Properties not in the map
 * are treated as passthrough (accept everything).
 */
export function getExpectation(property: string): PropertyExpectation {
  return PROPERTY_EXPECTATIONS[property] ?? PASSTHROUGH;
}
