import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: (format) => `index.${format}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        format: "esm",
        dir: "dist",
        entryFileNames: "index.es.js",
        assetFileNames: "[name][extname]",
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      "decode-named-character-reference": require.resolve(
        "decode-named-character-reference"
      ),
      "hast-util-from-html-isomorphic": require.resolve(
        "hast-util-from-html-isomorphic"
      ),
    },
  },
});
