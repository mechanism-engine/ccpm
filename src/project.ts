import path from "node:path";
import { ensureDir, exists } from "./utils.js";

export function validateProject(projectRoot: string): void {
	const pkgJson = path.join(projectRoot, "package.json");
	if (!exists(pkgJson)) {
		throw new Error(
			`package.json not found at ${pkgJson}\nRun ccpm from a Cocos Creator project directory or use --project <path>`,
		);
	}

	const assetsDir = path.join(projectRoot, "assets");
	if (!exists(assetsDir)) {
		throw new Error(
			`assets/ directory not found at ${projectRoot}\nThis doesn't appear to be a Cocos Creator project.`,
		);
	}
}

export function ensureExtensionsDir(projectRoot: string): string {
	const extensionsDir = path.join(projectRoot, "extensions");
	ensureDir(extensionsDir);
	return extensionsDir;
}
