import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { resolve } from "path"
import externals from "rollup-plugin-node-externals"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const libMode = process.env.LIB_MODE === "true"

  return {
    build: {
      minify: true,
      cssMinify: true,
      ...(libMode && {
        lib: {
          entry: resolve(__dirname, `src/core/index.ts`),
          name: "gesturx",
          fileName: "index",
        },
      }),
      emptyOutDir: mode !== `development`,
      sourcemap: true,
    },
    plugins: [
      react(),
      {
        enforce: `pre`,
        ...externals({
          peerDeps: libMode,
          deps: libMode,
          devDeps: libMode,
        }),
      },
      dts({
        rollupTypes: true
      }),
    ],
  }
})
