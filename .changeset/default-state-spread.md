---
'@tenphi/eslint-plugin-tasty': patch
---

`require-default-state` skips a state map that spreads another one (`fill: { ...(BASE_STYLES.fill as Record<string, string>), 'selected & disabled': '#surface-3' }`), since the spread may carry the `''` default.
