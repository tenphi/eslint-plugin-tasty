import { tasty } from '@tenphi/tasty';

import { mergeLayers } from './styles';

export const Card = tasty({
  styles: {
    fill: '#ff0000',
    // oxlint-disable-next-line tasty/no-raw-color-values -- brand color
    color: '#00ff00',
    preset: 'h9',
    paddding: '2x',
  },
});

export const layers = mergeLayers({ fill: '#0000ff' });
