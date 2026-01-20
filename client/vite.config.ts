import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';
const basePath = process.env.VITE_BASE_PATH || '/kai';

// Resolve SSL certs
const sslKeyPath = path.resolve(__dirname, '../backend/cert/key.pem');
const sslCertPath = path.resolve(__dirname, '../backend/cert/cert.pem');
const hasSSL = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);
const httpsConfig = hasSSL ? {
  key: fs.readFileSync(sslKeyPath),
  cert: fs.readFileSync(sslCertPath),
} : undefined;
console.log('hasSSL:', hasSSL);
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Auto-downgrade to http if no SSL certs are found for local dev
const proxyTarget = (!hasSSL && apiBaseUrl.includes('localhost'))
  ? apiBaseUrl.replace('https://', 'http://')
  : apiBaseUrl;
console.log('apiBaseUrl:', apiBaseUrl);
console.log('Proxy Target:', proxyTarget);

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
    https: httpsConfig,
    ...(isDev && {
      proxy: {
        '/api/kai': {
          target: proxyTarget,
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