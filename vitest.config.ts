import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    reporters: ['dot'],
    globals: true,
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx'],
  },
})

