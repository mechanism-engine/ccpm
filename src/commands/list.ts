import fs from "node:fs";
import path from "node:path";
import { discoverExtensions } from "../discovery.js";
import { ensureExtensionsDir, validateProject } from "../project.js";
import { readState } from "../state.js";
import { exists } from "../utils.js";

export async function cmdList(projectRoot: string): Promise<void> {
	validateProject(projectRoot);

	// Normalize path to handle macOS /var -> /private/var symlink
	const realProjectRoot = fs.realpathSync(projectRoot);
	const extensions = await discoverExtensions(realProjectRoot);
	const extensionsDir = ensureExtensionsDir(realProjectRoot);
	const state = readState(extensionsDir);

	if (extensions.length === 0) {
		console.log("No extensions found in node_modules.");
		return;
	}

	console.log(`Found ${extensions.length} extension(s):\n`);

	for (const ext of extensions) {
		const targetPath = path.join(extensionsDir, ext.extName);
		const deployed = exists(targetPath);
		const status = deployed ? "deployed" : "not deployed";

		const inState = state?.extensions[ext.extName] ? "tracked" : "untracked";

		console.log(`  ${ext.extName}`);
		console.log(`    package: ${ext.npmPackage}`);
		console.log(`    source:  ${ext.sourceDir}`);
		console.log(`    target:  extensions/${ext.extName}`);
		console.log(`    status:  ${status} (${inState})`);
		console.log();
	}
}
