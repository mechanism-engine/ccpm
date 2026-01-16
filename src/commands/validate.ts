import path from "node:path";
import { log } from "../logger.js";
import { exists, readJson } from "../utils.js";

export interface ValidationResultSuccess {
	valid: true;
	errors: [];
	warnings: string[];
	extName: string;
}

export interface ValidationResultError {
	valid: false;
	errors: string[];
	warnings: string[];
	extName?: string;
}

export type ValidationResult = ValidationResultSuccess | ValidationResultError;

interface PackageJson {
	name?: string;
	version?: string;
	main?: string;
	files?: string[];
	ccpm?: {
		extension?: {
			root?: string;
			name?: string;
		};
	};
}

export function validatePackage(packageDir: string): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const pkgJsonPath = path.join(packageDir, "package.json");

	// 1. Check root package.json exists
	if (!exists(pkgJsonPath)) {
		errors.push(`package.json not found in ${packageDir}`);
		return { valid: false, errors, warnings };
	}

	// 2. Parse root package.json
	let pkg: PackageJson;
	try {
		pkg = readJson<PackageJson>(pkgJsonPath);
	} catch {
		errors.push("package.json is not valid JSON. Check for syntax errors.");
		return { valid: false, errors, warnings };
	}

	// 3. Check ccpm.extension exists
	const ext = pkg?.ccpm?.extension;
	if (!ext) {
		errors.push(
			'Missing "ccpm.extension" in package.json. Add: { "ccpm": { "extension": { "root": "...", "name": "..." } } }',
		);
		return { valid: false, errors, warnings };
	}

	// 4. Check required fields
	if (!ext.root) {
		errors.push('Missing "ccpm.extension.root" - path to extension folder (e.g., "extension")');
	}
	if (!ext.name) {
		errors.push(
			'Missing "ccpm.extension.name" - unique extension identifier used in extensions/ folder',
		);
	}

	if (errors.length > 0) {
		return { valid: false, errors, warnings };
	}

	// 5. Check root directory exists
	const sourceDir = path.join(packageDir, ext.root as string);
	if (!exists(sourceDir)) {
		errors.push(`Root directory "${ext.root}" not found. Create it or update ccpm.extension.root`);
		return { valid: false, errors, warnings };
	}

	// 6. Check extension manifest exists
	const manifestPath = path.join(sourceDir, "package.json");
	if (!exists(manifestPath)) {
		errors.push(
			`Extension manifest not found at ${ext.root}/package.json. This file is required by Cocos Creator.`,
		);
		return { valid: false, errors, warnings };
	}

	// 7. Parse and validate extension manifest
	let manifest: PackageJson;
	try {
		manifest = readJson<PackageJson>(manifestPath);
	} catch {
		errors.push(`${ext.root}/package.json is not valid JSON. Check for syntax errors.`);
		return { valid: false, errors, warnings };
	}

	// 8. Check manifest required fields
	if (!manifest.name) {
		errors.push(`${ext.root}/package.json missing "name" field`);
	}
	if (!manifest.version) {
		errors.push(`${ext.root}/package.json missing "version" field`);
	}

	// 9. Check files array includes root (warning only)
	if (pkg.files && !pkg.files.some((f) => f.includes(ext.root as string))) {
		warnings.push(
			`"files" array in package.json may not include "${ext.root}". Extension won't be published to npm.`,
		);
	}

	if (errors.length > 0) {
		return { valid: false, errors, warnings, extName: ext.name };
	}

	return {
		valid: true,
		errors: [],
		warnings,
		extName: ext.name as string,
	};
}

export function cmdValidate(packageDir: string): void {
	const result = validatePackage(packageDir);

	if (result.valid) {
		log.success(`Package structure is valid. Extension: ${result.extName}`);
		if (result.warnings.length > 0) {
			log.warn("Warnings:");
			for (const warning of result.warnings) {
				log.warn(`  ${warning}`);
			}
		}
	} else {
		log.error("Package validation failed:");
		for (const error of result.errors) {
			log.error(`  ${error}`);
		}
		if (result.warnings.length > 0) {
			log.warn("Warnings:");
			for (const warning of result.warnings) {
				log.warn(`  ${warning}`);
			}
		}
	}
}
