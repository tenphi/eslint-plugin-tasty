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
const RADIUS_DIRECTIONAL_MODS = [
  ...DIRECTIONAL_MODS,
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
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
    acceptsMods: [...DIRECTIONAL_MODS, ...BORDER_STYLE_MODS],
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

  padding: { acceptsColor: false, acceptsMods: DIRECTIONAL_MODS },
  paddingInline: VALUE_ONLY,
  paddingBlock: VALUE_ONLY,
  margin: { acceptsColor: false, acceptsMods: DIRECTIONAL_MODS },
  fade: { acceptsColor: false, acceptsMods: DIRECTIONAL_MODS },
  inset: { acceptsColor: false, acceptsMods: DIRECTIONAL_MODS },

  width: { acceptsColor: false, acceptsMods: DIMENSION_MODS },
  height: { acceptsColor: false, acceptsMods: DIMENSION_MODS },

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
