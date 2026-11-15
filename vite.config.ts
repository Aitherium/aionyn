/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at https://aitherium.github.io/aionyn/ -- every asset path is under /aionyn/.
export default defineConfig({
  base: '/aionyn/',
  plugins: [react()],
  test: { environment: 'jsdom' },
})
