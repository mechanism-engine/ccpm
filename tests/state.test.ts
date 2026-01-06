import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStaleExtensions, getStatePath, readState, writeState } from "../src/state.js";
import type { ExtensionMetadata } from "../src/types.js";
import { type FixtureProject, createFixtureProject } from "./__fixtures__/create-fixture.js";

describe("state", () => {
	let fixture: FixtureProject;

	beforeEach(() => {
		fixture = createFixtureProject();
	});

	afterEach(() => {
		fixture.cleanup();
	});

	describe("getStatePath", () => {
		it("returns path to .ccpm-state.json in extensions dir", () => {
			const result = getStatePath(fixture.extensionsDir);
			expect(result).toBe(path.join(fixture.extensionsDir, ".ccpm-state.json"));
		});
	});

	describe("readState", () => {
		it("returns null when state file does not exist", () => {
			const result = readState(fixture.extensionsDir);
			expect(result).toBeNull();
		});

		it("reads state file correctly", () => {
			const state = {
				version: 1,
				deployedAt: "2024-01-01T00:00:00.000Z",
				extensions: {
					"my-ext": { npmPackage: "my-package", root: "cocos-extension" },
				},
			};
			fs.writeFileSync(getStatePath(fixture.extensionsDir), JSON.stringify(state));

			const result = readState(fixture.extensionsDir);

			expect(result).toEqual(state);
		});

		it("returns null on malformed JSON", () => {
			fs.writeFileSync(getStatePath(fixture.extensionsDir), "not json");

			const result = readState(fixture.extensionsDir);

			expect(result).toBeNull();
		});
	});

	describe("writeState", () => {
		it("writes state file with correct structure", () => {
			const extensions: ExtensionMetadata[] = [
				{
					npmPackage: "@mechanism-engine/ext-1",
					npmPackageDir: "/path/to/ext-1",
					sourceDir: "/path/to/ext-1/cocos-extension",
					extName: "ext-1",
				},
				{
					npmPackage: "ext-2",
					npmPackageDir: "/path/to/ext-2",
					sourceDir: "/path/to/ext-2/cocos-extension",
					extName: "ext-2",
				},
			];

			writeState(fixture.extensionsDir, extensions);

			const state = readState(fixture.extensionsDir);
			expect(state).not.toBeNull();
			expect(state?.version).toBe(1);
			expect(state?.extensions).toEqual({
				"ext-1": { npmPackage: "@mechanism-engine/ext-1", root: "cocos-extension" },
				"ext-2": { npmPackage: "ext-2", root: "cocos-extension" },
			});
		});

		it("includes deployedAt timestamp", () => {
			writeState(fixture.extensionsDir, []);

			const state = readState(fixture.extensionsDir);
			expect(state).not.toBeNull();
			expect(state?.deployedAt).toBeDefined();
			expect(new Date(state?.deployedAt ?? "").getTime()).toBeGreaterThan(0);
		});
	});

	describe("getStaleExtensions", () => {
		it("returns empty array when no state file", () => {
			const current: ExtensionMetadata[] = [];
			const result = getStaleExtensions(fixture.extensionsDir, current);
			expect(result).toEqual([]);
		});

		it("returns empty array when all extensions still exist", () => {
			const extensions: ExtensionMetadata[] = [
				{
					npmPackage: "pkg-1",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-1",
				},
			];
			writeState(fixture.extensionsDir, extensions);

			const result = getStaleExtensions(fixture.extensionsDir, extensions);

			expect(result).toEqual([]);
		});

		it("returns stale extension names", () => {
			// Previously deployed
			const oldExtensions: ExtensionMetadata[] = [
				{
					npmPackage: "pkg-1",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-1",
				},
				{
					npmPackage: "pkg-2",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-2",
				},
				{
					npmPackage: "pkg-3",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-3",
				},
			];
			writeState(fixture.extensionsDir, oldExtensions);

			// Currently available (ext-2 was removed)
			const currentExtensions: ExtensionMetadata[] = [
				{
					npmPackage: "pkg-1",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-1",
				},
				{
					npmPackage: "pkg-3",
					npmPackageDir: "/path",
					sourceDir: "/path/cocos-extension",
					extName: "ext-3",
				},
			];

			const result = getStaleExtensions(fixture.extensionsDir, currentExtensions);

			expect(result).toEqual(["ext-2"]);
		});
	});
});
