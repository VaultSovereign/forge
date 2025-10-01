import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: ['all'],
    proxy: {
      '/v1': {
        target: process.env.VITE_API_BASE || 'http://localhost:8787',
        changeOrigin: true,
      },
      '/guardian': {
        target: process.env.VITE_API_BASE || 'http://localhost:8787',
        changeOrigin: true,
      },
      '/metrics': {
        target: process.env.VITE_API_BASE || 'http://localhost:8787',
        changeOrigin: true,
      }
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
  },
})
