import { defineConfig } from 'tsup'

export default defineConfig({
  esbuildOptions(options, context) {
    options.format = 'esm'
  },
})