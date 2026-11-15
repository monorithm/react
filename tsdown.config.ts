import { defineConfig } from 'tsdown'

// The library build: ESM with type declarations. React, React DOM, and Base UI stay external.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  platform: 'neutral',
  external: ['react', 'react-dom', 'react/jsx-runtime', /^@base-ui\/react/],
  copy: [
    { from: 'src/tokens/tokens.css', to: 'dist' },
    { from: 'src/tokens/components.css', to: 'dist' },
    { from: 'src/tokens/theme.css', to: 'dist' },
  ],
})
