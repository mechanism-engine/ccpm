import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverExtensions } from "../src/discovery.js";
import { type FixtureProject, createFixtureProject } from "./__fixtures__/create-fixture.js";

describe("discoverExtensions", () => {
	let fixture: FixtureProject;

	beforeEach(() => {
		fixture = createFixtureProject();
	});

	afterEach(() => {
		fixture.cleanup();
	});

	it("returns empty array when no extensions in node_modules", async () => {
		fixture.addRegularPackage("lodash");
		fixture.addRegularPackage("express");

		const result = await discoverExtensions(fixture.root);

		expect(result).toEqual([]);
	});

	it("discovers unscoped extension package", async () => {
		fixture.addExtensionPackage({
			name: "my-extension",
			extName: "my-ext",
		});

		const result = await discoverExtensions(fixture.root);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			npmPackage: "my-extension",
			extName: "my-ext",
		});
	});

	it("discovers scoped extension package", async () => {
		fixture.addExtensionPackage({
			name: "@mechanism-engine/cc-sample",
			extName: "cc-sample",
		});

		const result = await discoverExtensions(fixture.root);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			npmPackage: "@mechanism-engine/cc-sample",
			extName: "cc-sample",
		});
	});

	it("discovers multiple extensions mixed with regular packages", async () => {
		fixture.addRegularPackage("lodash");
		fixture.addExtensionPackage({ name: "ext-one", extName: "ext-1" });
		fixture.addRegularPackage("express");
		fixture.addExtensionPackage({ name: "@scope/ext-two", extName: "ext-2" });

		const result = await discoverExtensions(fixture.root);

		expect(result).toHaveLength(2);
		const names = result.map((e) => e.extName).sort();
		expect(names).toEqual(["ext-1", "ext-2"]);
	});

	it("throws on duplicate extension name from different packages", async () => {
		fixture.addExtensionPackage({ name: "pkg-one", extName: "same-name" });
		fixture.addExtensionPackage({ name: "pkg-two", extName: "same-name" });

		await expect(discoverExtensions(fixture.root)).rejects.toThrow(
			/Duplicate extension name "same-name"/,
		);
	});

	it("uses custom root directory", async () => {
		fixture.addExtensionPackage({
			name: "custom-src-pkg",
			extName: "custom-ext",
			root: "editor-extension",
		});

		const result = await discoverExtensions(fixture.root);

		expect(result).toHaveLength(1);
		expect(result[0].sourceDir).toContain("editor-extension");
	});

	it("returns correct paths in extension metadata", async () => {
		fixture.addExtensionPackage({
			name: "@mechanism-engine/test-ext",
			extName: "test-ext",
		});

		const result = await discoverExtensions(fixture.root);

		expect(result).toHaveLength(1);
		expect(result[0].npmPackageDir).toContain("node_modules/@mechanism-engine/test-ext");
		expect(result[0].sourceDir).toContain(
			"node_modules/@mechanism-engine/test-ext/ccpm-extension",
		);
	});

	describe("warning paths", () => {
		it("warns and skips when root directory does not exist", async () => {
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// Create package with ccpm metadata but no root directory
			const pkgDir = path.join(fixture.nodeModulesDir, "broken-ext");
			fs.mkdirSync(pkgDir, { recursive: true });
			fs.writeFileSync(
				path.join(pkgDir, "package.json"),
				JSON.stringify({
					name: "broken-ext",
					ccpm: {
						extension: {
							root: "extension",
							name: "broken-ext",
						},
					},
				}),
			);
			// Don't create the root directory

			const result = await discoverExtensions(fixture.root);

			expect(result).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));

			consoleSpy.mockRestore();
		});

		it("warns and skips when extension manifest is missing", async () => {
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// Create package with root dir but no package.json inside
			const pkgDir = path.join(fixture.nodeModulesDir, "no-manifest");
			const sourceDir = path.join(pkgDir, "extension");
			fs.mkdirSync(sourceDir, { recursive: true });
			fs.writeFileSync(
				path.join(pkgDir, "package.json"),
				JSON.stringify({
					name: "no-manifest",
					ccpm: {
						extension: {
							root: "extension",
							name: "no-manifest-ext",
						},
					},
				}),
			);
			// Don't create package.json in root dir

			const result = await discoverExtensions(fixture.root);

			expect(result).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("missing extension manifest"),
			);

			consoleSpy.mockRestore();
		});

		it("skips packages with malformed package.json", async () => {
			// Create package with invalid JSON
			const pkgDir = path.join(fixture.nodeModulesDir, "malformed-pkg");
			fs.mkdirSync(pkgDir, { recursive: true });
			fs.writeFileSync(path.join(pkgDir, "package.json"), "{ invalid json }");

			const result = await discoverExtensions(fixture.root);

			expect(result).toEqual([]);
		});

		it("returns empty when node_modules does not exist", async () => {
			// Remove node_modules
			fs.rmSync(fixture.nodeModulesDir, { recursive: true });

			const result = await discoverExtensions(fixture.root);

			expect(result).toEqual([]);
		});
	});
});
