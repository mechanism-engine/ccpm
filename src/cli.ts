import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import { cmdInstall } from "./commands/install.js";
import { cmdList } from "./commands/list.js";
import { cmdValidate, validatePackage } from "./commands/validate.js";
import { log } from "./logger.js";

const program = new Command();

program
	.name("ccpm")
	.description("Unofficial extension manager for Cocos Creator - deploy extensions from npm")
	.version("__VERSION__")
	.option("-q, --quiet", "Suppress all output except errors")
	.hook("preAction", () => {
		const opts = program.opts();
		if (opts.quiet) {
			log.setQuiet(true);
		}
	});

program
	.command("list")
	.description("List discovered extensions")
	.option("-p, --project <path>", "Path to Cocos Creator project", process.cwd())
	.action(async (options: { project: string }) => {
		try {
			await cmdList(options.project);
		} catch (err) {
			log.error(err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

program
	.command("install")
	.description("Copy extensions to project")
	.option("-p, --project <path>", "Path to Cocos Creator project", process.cwd())
	.option("--clean", "Remove stale extensions", false)
	.action(async (options: { project: string; clean: boolean }) => {
		try {
			await cmdInstall(options.project, options.clean);
		} catch (err) {
			log.error(err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

program
	.command("validate")
	.description("Validate package structure before publishing")
	.argument("[path]", "Package directory", process.cwd())
	.action((packageDir: string) => {
		const result = validatePackage(path.resolve(packageDir));
		cmdValidate(path.resolve(packageDir));
		if (!result.valid) {
			process.exit(1);
		}
	});

program.parse();
