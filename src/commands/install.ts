import fs from "node:fs";
import path from "node:path";
import { discoverExtensions } from "../discovery.js";
import { ensureExtensionsDir, validateProject } from "../project.js";
import { getStaleExtensions, writeState } from "../state.js";
import { copyDir, exists, isSymlink, rmForce } from "../utils.js";

export async function cmdInstall(projectRoot: string, clean: boolean): Promise<void> {
	validateProject(projectRoot);

	// Normalize path to handle macOS /var -> /private/var symlink
	const realProjectRoot = fs.realpathSync(projectRoot);
	const extensions = await discoverExtensions(realProjectRoot);
	const extensionsDir = ensureExtensionsDir(realProjectRoot);

	if (extensions.length === 0) {
		console.log("No extensions found in node_modules.");
		return;
	}

	// Handle --clean: remove stale extensions
	if (clean) {
		const stale = getStaleExtensions(extensionsDir, extensions);
		for (const name of stale) {
			const stalePath = path.join(extensionsDir, name);
			if (exists(stalePath) || isSymlink(stalePath)) {
				rmForce(stalePath);
				console.log(`  removed stale: ${name}`);
			}
		}
	}

	let count = 0;
	const deployed = new Map<string, string>();

	for (const ext of extensions) {
		const target = path.join(extensionsDir, ext.extName);

		// Check for duplicate extension names from different packages
		if (deployed.has(ext.extName)) {
			console.error(
				`\nError: Multiple packages try to deploy extension "${ext.extName}":
  - ${deployed.get(ext.extName)}
  - ${ext.npmPackage}
This can happen with pnpm hidden directories. Ensure only one package provides this extension.`,
			);
			process.exit(1);
		}

		// Remove existing (symlink or directory) - always attempt removal
		rmForce(target);

		// Copy directory
		copyDir(ext.sourceDir, target);

		deployed.set(ext.extName, ext.npmPackage);
		count++;
		console.log(`  ${ext.extName} <- ${ext.sourceDir}`);
	}

	// Write state
	writeState(extensionsDir, extensions);

	console.log(`\nccpm install: deployed ${count} extension(s)`);
}
