import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cmdInstall } from "../src/commands/install.js";
import { readState } from "../src/state.js";
import { type FixtureProject, createFixtureProject } from "./__fixtures__/create-fixture.js";

describe("integration", () => {
	let fixture: FixtureProject;

	beforeEach(() => {
		fixture = createFixtureProject();
	});

	afterEach(() => {
		fixture.cleanup();
	});

	describe("no extensions", () => {
		it("cmdInstall handles no extensions gracefully", async () => {
			// No extensions added
			await expect(cmdInstall(fixture.root, false)).resolves.not.toThrow();
		});

		it("cmdInstall does not create state file when no extensions", async () => {
			await cmdInstall(fixture.root, false);

			const state = readState(fixture.extensionsDir);
			// When no extensions found, state file is not created
			expect(state).toBeNull();
		});
	});

	describe("cmdInstall", () => {
		it("copies extension files", async () => {
			fixture.addExtensionPackage({
				name: "my-ext",
				extName: "my-ext",
			});

			await cmdInstall(fixture.root, false);

			const extPath = path.join(fixture.extensionsDir, "my-ext");
			expect(fs.existsSync(extPath)).toBe(true);
			expect(fs.existsSync(path.join(extPath, "package.json"))).toBe(true);
			expect(fs.existsSync(path.join(extPath, "README.md"))).toBe(true);
		});

		it("writes state file after deployment", async () => {
			fixture.addExtensionPackage({
				name: "my-ext",
				extName: "my-ext",
			});

			await cmdInstall(fixture.root, false);

			const state = readState(fixture.extensionsDir);
			expect(state).not.toBeNull();
			expect(state?.extensions["my-ext"]).toBeDefined();
		});

		it("replaces existing copy", async () => {
			fixture.addExtensionPackage({
				name: "my-ext",
				extName: "my-ext",
			});

			// First deployment
			await cmdInstall(fixture.root, false);

			// Second deployment
			await cmdInstall(fixture.root, false);

			const extPath = path.join(fixture.extensionsDir, "my-ext");
			expect(fs.existsSync(extPath)).toBe(true);
		});

		it("deploys multiple extensions", async () => {
			fixture.addExtensionPackage({ name: "ext-1", extName: "ext-1" });
			fixture.addExtensionPackage({ name: "@scope/ext-2", extName: "ext-2" });

			await cmdInstall(fixture.root, false);

			expect(fs.existsSync(path.join(fixture.extensionsDir, "ext-1"))).toBe(true);
			expect(fs.existsSync(path.join(fixture.extensionsDir, "ext-2"))).toBe(true);
		});

		describe("--clean", () => {
			it("removes stale extensions", async () => {
				// Deploy two extensions
				fixture.addExtensionPackage({ name: "ext-1", extName: "ext-1" });
				fixture.addExtensionPackage({ name: "ext-2", extName: "ext-2" });
				await cmdInstall(fixture.root, false);

				// Remove ext-2 from node_modules
				fs.rmSync(path.join(fixture.nodeModulesDir, "ext-2"), {
					recursive: true,
				});

				// Install with --clean
				await cmdInstall(fixture.root, true);

				expect(fs.existsSync(path.join(fixture.extensionsDir, "ext-1"))).toBe(true);
				expect(fs.existsSync(path.join(fixture.extensionsDir, "ext-2"))).toBe(false);
			});

			it("does not remove manually installed extensions", async () => {
				// Deploy one extension via ccpm
				fixture.addExtensionPackage({ name: "ext-1", extName: "ext-1" });
				await cmdInstall(fixture.root, false);

				// Manually add another extension (not tracked by ccpm)
				const manualExtPath = path.join(fixture.extensionsDir, "manual-ext");
				fs.mkdirSync(manualExtPath);
				fs.writeFileSync(
					path.join(manualExtPath, "package.json"),
					JSON.stringify({ name: "manual-ext" }),
				);

				// Install with --clean
				await cmdInstall(fixture.root, true);

				// Manual extension should still exist
				expect(fs.existsSync(manualExtPath)).toBe(true);
			});
		});
	});
});
