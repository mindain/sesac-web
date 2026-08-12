import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sesac-web/ecommerce/',
  build: {
    outDir: '../ecommerce',
    emptyOutDir: true,
    // meta.json/monthly.json are small enough (~2KB) that Vite's default
    // 4KB inline threshold would base64-inline them into the JS bundle
    // instead of emitting them as separate hashed files. Disable inlining
    // for all imported assets so the three data JSON files are always
    // emitted as their own content-hashed files under assets/, consistent
    // and predictable regardless of future data size.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  }
})
