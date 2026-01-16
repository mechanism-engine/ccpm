import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cmdInstall } from "../src/commands/install.js";
import { cmdList } from "../src/commands/list.js";
import { type FixtureProject, createFixtureProject } from "./__fixtures__/create-fixture.js";

describe("cmdList", () => {
	let fixture: FixtureProject;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fixture = createFixtureProject();
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		fixture.cleanup();
		consoleSpy.mockRestore();
	});

	it("shows 'No extensions found' when none exist", async () => {
		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No extensions found"));
	});

	it("lists discovered extensions", async () => {
		fixture.addExtensionPackage({
			name: "@mechanism-engine/my-ext",
			extName: "my-ext",
		});

		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Found 1 extension(s)"));
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("my-ext"));
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("@mechanism-engine/my-ext"));
	});

	it("shows 'not deployed' status for undeployed extension", async () => {
		fixture.addExtensionPackage({
			name: "my-ext",
			extName: "my-ext",
		});

		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("not deployed (untracked)"));
	});

	it("shows 'deployed' status after install command", async () => {
		fixture.addExtensionPackage({
			name: "my-ext",
			extName: "my-ext",
		});

		// Deploy first
		await cmdInstall(fixture.root, false);
		consoleSpy.mockClear();

		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("deployed (tracked)"));
	});

	it("shows correct target path", async () => {
		fixture.addExtensionPackage({
			name: "test-ext",
			extName: "test-ext",
		});

		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("extensions/test-ext"));
	});

	it("lists multiple extensions", async () => {
		fixture.addExtensionPackage({ name: "ext-1", extName: "ext-1" });
		fixture.addExtensionPackage({ name: "ext-2", extName: "ext-2" });

		await cmdList(fixture.root);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Found 2 extension(s)"));
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("ext-1"));
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("ext-2"));
	});
});
