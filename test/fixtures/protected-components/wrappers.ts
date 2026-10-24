import { tasty } from '@tenphi/tasty';
import { Button } from '@my-org/ui';
import * as UI from '@my-org/ui';

export const CopyButton = tasty(Button, { type: 'clear' });
export const AliasedCard = UI.Card;
export const SplitButton = Button.Split;
export default tasty(CopyButton, {});
