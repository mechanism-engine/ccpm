import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cmdValidate, validatePackage } from "../src/commands/validate.js";

describe("validatePackage", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccpm-validate-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function createValidPackage() {
		// Create root package.json
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test-extension",
				version: "1.0.0",
				ccpm: {
					extension: {
						root: "extension",
						name: "test-ext",
					},
				},
				files: ["extension/**"],
			}),
		);

		// Create source directory
		const sourceDir = path.join(tmpDir, "extension");
		fs.mkdirSync(sourceDir);

		// Create extension manifest
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify({
				name: "test-ext",
				version: "1.0.0",
				main: "./dist/main.js",
			}),
		);
	}

	it("validates a correct package structure", () => {
		createValidPackage();

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("fails when package.json is missing", () => {
		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("package.json not found");
	});

	it("fails when package.json is invalid JSON", () => {
		fs.writeFileSync(path.join(tmpDir, "package.json"), "{ invalid }");

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("package.json is not valid JSON");
	});

	it("fails when ccpm.extension is missing", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("ccpm.extension");
	});

	it("fails when root field is missing", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { name: "test-ext" } },
			}),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("ccpm.extension.root");
	});

	it("fails when name field is missing", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension" } },
			}),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("ccpm.extension.name");
	});

	it("fails when root directory does not exist", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
			}),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("extension");
		expect(result.errors[0]).toContain("not found");
	});

	it("fails when extension manifest is missing", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
			}),
		);
		fs.mkdirSync(path.join(tmpDir, "extension"));

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("extension/package.json");
	});

	it("fails when extension manifest is invalid JSON", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
			}),
		);
		const sourceDir = path.join(tmpDir, "extension");
		fs.mkdirSync(sourceDir);
		fs.writeFileSync(path.join(sourceDir, "package.json"), "{ invalid }");

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("not valid JSON");
	});

	it("fails when manifest is missing name field", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
			}),
		);
		const sourceDir = path.join(tmpDir, "extension");
		fs.mkdirSync(sourceDir);
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify({ version: "1.0.0", main: "./main.js" }),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"name"');
	});

	it("fails when manifest is missing version field", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
			}),
		);
		const sourceDir = path.join(tmpDir, "extension");
		fs.mkdirSync(sourceDir);
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify({ name: "test-ext", main: "./main.js" }),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain('"version"');
	});

	it("warns when files array does not include root", () => {
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "extension", name: "test-ext" } },
				files: ["dist/**"],
			}),
		);
		const sourceDir = path.join(tmpDir, "extension");
		fs.mkdirSync(sourceDir);
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify({ name: "test-ext", version: "1.0.0", main: "./main.js" }),
		);

		const result = validatePackage(tmpDir);

		expect(result.valid).toBe(true);
		expect(result.warnings[0]).toContain("extension");
	});

	it("no warning when files array includes root", () => {
		createValidPackage();

		const result = validatePackage(tmpDir);

		expect(result.warnings).toEqual([]);
	});
});

describe("cmdValidate", () => {
	let tmpDir: string;
	let consoleSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccpm-validate-cmd-test-"));
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it("prints success message for valid package", () => {
		// Create valid package
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({
				name: "test",
				ccpm: { extension: { root: "ext", name: "test-ext" } },
			}),
		);
		const sourceDir = path.join(tmpDir, "ext");
		fs.mkdirSync(sourceDir);
		fs.writeFileSync(
			path.join(sourceDir, "package.json"),
			JSON.stringify({ name: "test-ext", version: "1.0.0", main: "./main.js" }),
		);

		cmdValidate(tmpDir);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Package structure is valid"));
	});

	it("prints error messages for invalid package", () => {
		cmdValidate(tmpDir);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Package validation failed"),
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("package.json not found"));
	});
});
