import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue({ ...templateCompilerOptions })],
  resolve: {
    alias: {
      'hic4tres/vue': fileURLToPath(new URL('../src/vue.ts', import.meta.url)),
      'hic4tres': fileURLToPath(new URL('../src/index.ts', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000
  }
})
