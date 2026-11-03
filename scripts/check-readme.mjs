/**
 * Type-checks each `ts` example of README.md against src/core, with the
 * repo's tsc and tsconfig. typescript-docs-verifier does the same through
 * the TypeScript compiler API, which TypeScript 7 doesn't ship.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const examples = [...readme.matchAll(/^```ts\n([\s\S]*?)^```$/gm)];

if (examples.length === 0) {
	throw new Error("README.md has no ts example to check");
}

// inside node_modules, so that the examples resolve rxjs like the library
const dir = join(root, "node_modules", ".cache", "readme-examples");

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

for (const { 1: code, index } of examples) {
	// named after its line, so that an error points to the example
	const line = readme.slice(0, index).split("\n").length;

	writeFileSync(join(dir, `README.md-line-${line}.ts`), code);
}

writeFileSync(
	join(dir, "tsconfig.json"),
	JSON.stringify({
		extends: join(root, "tsconfig.json"),
		compilerOptions: {
			paths: { gesturx: [join(root, "src", "core", "index.ts")] },
		},
		include: ["*.ts"],
	}),
);

try {
	execFileSync(
		join(root, "node_modules", ".bin", "tsc"),
		["-p", join(dir, "tsconfig.json")],
		{ stdio: "inherit" },
	);
	console.log(`${examples.length} README.md examples type-check`);
} catch {
	process.exitCode = 1;
}
