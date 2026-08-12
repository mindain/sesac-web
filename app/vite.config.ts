import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sesac-web/dashboard/',
  build: {
    outDir: '../dashboard',
    emptyOutDir: true
  }
})
