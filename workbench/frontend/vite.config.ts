// workbench/frontend/vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DEV_PORT = Number(process.env.VITE_DEV_PORT || process.env.PORT || 5173);
const BFF_PORT = Number(process.env.BFF_PORT || process.env.VITE_BFF_PORT || 8787);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 (Replit/containers)
    port: DEV_PORT,
    strictPort: false,
    allowedHosts: true, // accept Replit preview host
    proxy: {
      '/v1': {
        target: `http://127.0.0.1:${BFF_PORT}`,
        changeOrigin: true,
      },
      '/guardian': {
        target: `http://127.0.0.1:${BFF_PORT}`,
        changeOrigin: true,
      },
      '/metrics': {
        target: `http://127.0.0.1:${BFF_PORT}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
