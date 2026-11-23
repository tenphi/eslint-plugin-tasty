import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
  outDir: 'dist',
  unbundle: true,
  // Rule implementation types are build-time only. Public types are standalone.
  external: [/^@typescript-eslint\/utils(?:\/|$)/],
  dts: true,
  platform: 'node',
  target: 'es2022',
  sourcemap: true,
  clean: true,
  fixedExtension: false,
});
