import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isDev = process.env.NODE_ENV !== 'production';
const basePath = process.env.VITE_BASE_PATH || '/kai';

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Static build için optimize edilmiş ayarlar
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    ...(isDev && {
      proxy: {
        '/api/kai': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/kai/, ''),
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    }),
  },
  optimizeDeps: {
    include: ["@xyflow/react"],
  },
});