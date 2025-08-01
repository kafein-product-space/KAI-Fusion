import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    ...(isDev && {
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    }),
  },
  optimizeDeps: {
    include: ["@xyflow/react"],
  },
  ssr: {
    noExternal: ['@xyflow/react'],
  },
});
