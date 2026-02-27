import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
  outDir: 'dist',
  unbundle: true,
  dts: true,
  platform: 'node',
  target: 'es2022',
  sourcemap: true,
  clean: true,
});
