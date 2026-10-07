export interface Styles {
  position?: string;
  gap?: string | number;
  fill?: string;
}
export type BaseStyleProps = Pick<Styles, 'position' | 'gap' | 'fill'>;
export type StyleValue<T> = T | null | undefined;
