import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json" with { type: "json" };

export default {
	input: "src/cli.ts",
	output: {
		file: "dist/cli.js",
		format: "es",
		sourcemap: true,
		banner: "#!/usr/bin/env node",
	},
	external: ["node:fs", "node:path", "node:process", "commander"],
	plugins: [
		replace({
			preventAssignment: true,
			__VERSION__: pkg.version,
		}),
		resolve(),
		typescript({
			tsconfig: "./tsconfig.json",
			compilerOptions: {
				noEmit: false,
				declaration: false,
			},
		}),
	],
};
