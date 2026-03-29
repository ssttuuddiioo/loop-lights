import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 4200,
    strictPort: true,
    proxy: {
      '/elm': {
        target: 'http://192.168.1.206:8057',
        changeOrigin: true,
        // No rewrite — /elm/stages proxies to http://192.168.1.206:8057/elm/stages
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
