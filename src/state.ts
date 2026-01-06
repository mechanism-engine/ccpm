import path from "node:path";
import type { CcpmState, ExtensionMetadata } from "./types.js";
import { exists, readJson, writeJson } from "./utils.js";

const STATE_FILE = ".ccpm-state.json";

export function getStatePath(extensionsDir: string): string {
	return path.join(extensionsDir, STATE_FILE);
}

export function readState(extensionsDir: string): CcpmState | null {
	const statePath = getStatePath(extensionsDir);
	if (!exists(statePath)) return null;

	try {
		return readJson<CcpmState>(statePath);
	} catch {
		return null;
	}
}

export function writeState(extensionsDir: string, extensions: ExtensionMetadata[]): void {
	const state: CcpmState = {
		version: 1,
		deployedAt: new Date().toISOString(),
		extensions: {},
	};

	for (const ext of extensions) {
		state.extensions[ext.extName] = {
			npmPackage: ext.npmPackage,
			root: path.basename(ext.sourceDir),
		};
	}

	writeJson(getStatePath(extensionsDir), state);
}

export function getStaleExtensions(
	extensionsDir: string,
	currentExtensions: ExtensionMetadata[],
): string[] {
	const state = readState(extensionsDir);
	if (!state) return [];

	const currentNames = new Set(currentExtensions.map((e) => e.extName));
	const stale: string[] = [];

	for (const name of Object.keys(state.extensions)) {
		if (!currentNames.has(name)) {
			stale.push(name);
		}
	}

	return stale;
}
