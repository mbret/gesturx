import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import externals from "rollup-plugin-node-externals";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
	const libMode = process.env.LIB_MODE === "true";

	return {
		// public/ holds demo assets, keep them out of the published library.
		publicDir: libMode ? false : "public",
		build: {
			minify: true,
			cssMinify: true,
			...(libMode && {
				// Vite 7+ defaults to "baseline-widely-available". Keep Vite 6's default
				// target so the published bundles still support the same browsers.
				target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
				lib: {
					entry: resolve(import.meta.dirname, "src/core/index.ts"),
					name: "gesturx",
					fileName: "index",
				},
			}),
			emptyOutDir: mode !== "development",
			sourcemap: true,
			rolldownOptions: {
				output: {
					// Rollup always emitted "use strict" in non-ESM (UMD) output, Rolldown
					// only does so when the source has the directive.
					strict: true,
				},
			},
		},
		plugins: [
			react(),
			{
				enforce: "pre",
				...externals({
					peerDeps: libMode,
					deps: libMode,
					devDeps: libMode,
				}),
			},
			dts({
				bundleTypes: libMode && {
					// TypeScript 7 no longer ships lib typings in `typescript/lib`, which
					// is where the plugin tells api-extractor to look. Unset it so
					// api-extractor uses the libs of its own bundled compiler.
					invokeOptions: { typescriptCompilerFolder: undefined },
				},
			}),
		],
	};
});
