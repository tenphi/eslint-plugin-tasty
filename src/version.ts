import { createRequire } from 'node:module';

// Read from package.json so the version cannot drift from the released one, as
// a hardcoded literal once did. `../package.json` resolves to the package root
// from both `src/` and the unbundled `dist/`.
export const { version } = createRequire(import.meta.url)(
  '../package.json',
) as { version: string };
