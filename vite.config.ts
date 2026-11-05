import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Assign the common runtime before editor dependencies to avoid eager 3D imports.
          if (id.includes('commonjsHelpers') || id.includes('vite/preload-helper')) return 'react-vendor'
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'react-vendor'
            }
            if (/[\\/]node_modules[\\/](three|three-[^\\/]+|@react-three)[\\/]/.test(id)) {
              return 'three-vendor'
            }
            if (id.includes('motion')) {
              return 'motion-vendor'
            }
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
