import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/cli/index.ts' },
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: false,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
