import type { BaseStyleProps, Styles, StyleValue } from '@tenphi/tasty';

type Content = string | number | { render: string } | null;
export const TabDropIndicator = (props: {
  position: 'before' | 'after';
  prefix?: Content;
}) => null;
export const Box = (props: BaseStyleProps) => null;
export const Item = (props: BaseStyleProps & { prefix?: Content }) => null;
export const PartialBox = (props: Partial<BaseStyleProps>) => null;
type LocalGap = Styles['gap'];
export const RetypedBox = (props: { gap?: LocalGap }) => null;
export const StyleValueBox = (props: { gap?: StyleValue<'17px' | '1x'> }) =>
  null;
export const PrimitiveBox = (props: { position?: string; gap?: number }) =>
  null;
export const UnknownBox = (props: any) => null;
export const BrokenBox = (props: { position?: MissingType }) => null;
export const MixedBox = (
  props: BaseStyleProps | { position: 'before' | 'after' },
) => null;
