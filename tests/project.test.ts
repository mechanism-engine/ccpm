import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureExtensionsDir, validateProject } from "../src/project.js";

describe("project", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccpm-project-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("validateProject", () => {
		it("throws when package.json is missing", () => {
			// Create assets/ but no package.json
			fs.mkdirSync(path.join(tmpDir, "assets"));

			expect(() => validateProject(tmpDir)).toThrow(/package\.json not found/);
		});

		it("throws when assets/ directory is missing", () => {
			// Create package.json but no assets/
			fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }));

			expect(() => validateProject(tmpDir)).toThrow(/assets\/ directory not found/);
		});

		it("passes validation for valid Cocos Creator project", () => {
			// Create both package.json and assets/
			fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }));
			fs.mkdirSync(path.join(tmpDir, "assets"));

			expect(() => validateProject(tmpDir)).not.toThrow();
		});
	});

	describe("ensureExtensionsDir", () => {
		it("creates extensions/ directory if not exists", () => {
			fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }));
			fs.mkdirSync(path.join(tmpDir, "assets"));

			const result = ensureExtensionsDir(tmpDir);

			expect(result).toBe(path.join(tmpDir, "extensions"));
			expect(fs.existsSync(result)).toBe(true);
		});

		it("returns path if extensions/ already exists", () => {
			fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }));
			fs.mkdirSync(path.join(tmpDir, "assets"));
			fs.mkdirSync(path.join(tmpDir, "extensions"));

			const result = ensureExtensionsDir(tmpDir);

			expect(result).toBe(path.join(tmpDir, "extensions"));
		});
	});
});
