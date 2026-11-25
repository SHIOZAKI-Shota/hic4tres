import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', vue: 'src/vue.ts' },
  format: ['esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['three', 'vue', '@tresjs/core']
})
