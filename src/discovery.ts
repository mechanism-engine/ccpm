import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { ExtensionMetadata } from "./types.js";
import { exists, readJson } from "./utils.js";

const require = createRequire(import.meta.url);
const Arborist = require("@npmcli/arborist");

interface ExtensionMeta {
	root?: string;
	name?: string;
}

interface PackageJsonWithCcpm {
	name?: string;
	workspaces?: string[] | { packages?: string[] };
	ccpm?: {
		extension?: ExtensionMeta;
	};
}

/**
 * Find the workspace root by walking up the directory tree.
 * Returns the path containing node_modules with actual packages,
 * or the original path if no workspace root is found.
 */
function findWorkspaceRoot(startPath: string): string {
	let current = startPath;
	const root = path.parse(current).root;

	while (current !== root) {
		const pkgJsonPath = path.join(current, "package.json");

		if (exists(pkgJsonPath)) {
			try {
				const pkg = readJson<PackageJsonWithCcpm>(pkgJsonPath);
				// If this package.json has workspaces, this is the root
				if (pkg.workspaces) {
					return current;
				}
			} catch {
				// Ignore parse errors
			}
		}

		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}

	// No workspace root found, return original
	return startPath;
}

export async function discoverExtensions(projectRoot: string): Promise<ExtensionMetadata[]> {
	// Find workspace root to handle monorepos where packages are hoisted
	const workspaceRoot = findWorkspaceRoot(projectRoot);

	const arb = new Arborist({ path: workspaceRoot });
	const tree = await arb.loadActual();

	const extensions: ExtensionMetadata[] = [];
	const seenNames = new Map<string, string>();
	const seenPaths = new Set<string>();

	// Iterate all packages in the tree (using inventory to find all installed packages)
	for (const node of tree.inventory.values()) {
		// Skip if we've already processed this physical path (handles symlinks/links)
		const realPath = fs.realpathSync(node.path);
		if (seenPaths.has(realPath)) continue;
		seenPaths.add(realPath);
		// Skip root node and non-package nodes
		if (node.isRoot || node.location === "") continue;

		const pkg = node.package as PackageJsonWithCcpm;
		const ext = pkg?.ccpm?.extension;
		if (!ext?.root || !ext?.name) continue;

		// Skip hidden/temp directories (pnpm artifacts)
		if (node.name.startsWith(".")) continue;

		const npmPackage = pkg.name || node.name;
		const pkgDir = node.path;

		const sourceDir = path.join(pkgDir, ext.root);
		if (!exists(sourceDir)) {
			console.error(
				`Warning: ${npmPackage} declares extension but root directory "${ext.root}" not found. Skipping.`,
			);
			continue;
		}

		// Check for extension manifest
		const extManifestPath = path.join(sourceDir, "package.json");
		if (!exists(extManifestPath)) {
			console.error(
				`Warning: ${npmPackage} missing extension manifest at ${ext.root}/package.json. Skipping.`,
			);
			continue;
		}

		// Check for duplicate extension names
		if (seenNames.has(ext.name)) {
			throw new Error(
				`Duplicate extension name "${ext.name}" found in:\n  - ${seenNames.get(ext.name)}\n  - ${npmPackage}\nChange ccpm.extension.name in one of the packages to make them unique.`,
			);
		}
		seenNames.set(ext.name, npmPackage);

		extensions.push({
			npmPackage,
			npmPackageDir: pkgDir,
			sourceDir,
			extName: ext.name,
		});
	}

	return extensions;
}
