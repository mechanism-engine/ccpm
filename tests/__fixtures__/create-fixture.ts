import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ExtensionPackageOptions {
	name: string;
	extName: string;
	root?: string;
}

export interface FixtureProject {
	root: string;
	nodeModulesDir: string;
	extensionsDir: string;
	cleanup: () => void;
	addExtensionPackage: (opts: ExtensionPackageOptions) => string;
	addRegularPackage: (name: string) => string;
}

/**
 * Creates a temporary Cocos Creator project fixture for testing
 */
export function createFixtureProject(): FixtureProject {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccpm-fixture-"));
	const nodeModulesDir = path.join(root, "node_modules");
	const extensionsDir = path.join(root, "extensions");
	const assetsDir = path.join(root, "assets");

	// Create Cocos Creator project structure
	fs.mkdirSync(nodeModulesDir, { recursive: true });
	fs.mkdirSync(extensionsDir, { recursive: true });
	fs.mkdirSync(assetsDir, { recursive: true });

	// Track dependencies for Arborist
	const dependencies: Record<string, string> = {};

	const updateProjectPackageJson = (): void => {
		fs.writeFileSync(
			path.join(root, "package.json"),
			JSON.stringify(
				{
					name: "test-cocos-project",
					version: "1.0.0",
					private: true,
					dependencies,
				},
				null,
				2,
			),
		);
	};

	// Create initial project package.json
	updateProjectPackageJson();

	const addExtensionPackage = (opts: ExtensionPackageOptions): string => {
		const extRoot = opts.root || "cocos-extension";
		const pkgDir = path.join(nodeModulesDir, opts.name);

		fs.mkdirSync(pkgDir, { recursive: true });

		// NPM package.json with ccpm metadata
		fs.writeFileSync(
			path.join(pkgDir, "package.json"),
			JSON.stringify(
				{
					name: opts.name,
					version: "1.0.0",
					ccpm: {
						extension: {
							root: extRoot,
							name: opts.extName,
						},
					},
				},
				null,
				2,
			),
		);

		// Extension root directory
		const sourceDir = path.join(pkgDir, extRoot);
		fs.mkdirSync(sourceDir, { recursive: true });

		// Extension manifest (Cocos Creator package.json)
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify(
				{
					name: opts.extName,
					version: "1.0.0",
					package_version: 2,
					main: "./dist/main.js",
				},
				null,
				2,
			),
		);

		// Create a sample file in the extension
		fs.writeFileSync(path.join(sourceDir, "README.md"), `# ${opts.extName}\n`);

		// Add to dependencies and update package.json (for Arborist)
		dependencies[opts.name] = "^1.0.0";
		updateProjectPackageJson();

		return pkgDir;
	};

	const addRegularPackage = (name: string): string => {
		const pkgDir = path.join(nodeModulesDir, name);
		fs.mkdirSync(pkgDir, { recursive: true });

		fs.writeFileSync(
			path.join(pkgDir, "package.json"),
			JSON.stringify(
				{
					name,
					version: "1.0.0",
				},
				null,
				2,
			),
		);

		// Add to dependencies and update package.json (for Arborist)
		dependencies[name] = "^1.0.0";
		updateProjectPackageJson();

		return pkgDir;
	};

	const cleanup = (): void => {
		fs.rmSync(root, { recursive: true, force: true });
	};

	return {
		root,
		nodeModulesDir,
		extensionsDir,
		cleanup,
		addExtensionPackage,
		addRegularPackage,
	};
}
