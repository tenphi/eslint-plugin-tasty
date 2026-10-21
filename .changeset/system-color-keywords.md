---
'@tenphi/eslint-plugin-tasty': patch
---

`valid-value` accepts CSS system colors (`Canvas`, `CanvasText`, `Highlight`, `ButtonText`, `GrayText`, `LinkText`, …) and named colors wherever a color is. `border: '1bw Highlight'`, `outline: '1ow Highlight'`, `fill: 'Canvas'` and `color: 'CanvasText'` were reported as invalid modifiers, so a forced-colors style could not be written without disabling the rule. The rule now recognizes the same keywords as Tasty 3.12, case-insensitively: the 148 named colors and the 19 current system colors. The deprecated system colors (`Menu`, `Window`, `ButtonHighlight`, …) are still reported, and a color keyword in a property that takes no color (`padding: '2x Highlight'`) is reported as an unexpected color. `no-raw-color-values` still suggests a token for a named color such as `red`, and does not flag system colors.
