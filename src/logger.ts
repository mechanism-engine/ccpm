import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pc = require("picocolors");

let quiet = false;

export function setQuiet(value: boolean): void {
	quiet = value;
}

export function isQuiet(): boolean {
	return quiet;
}

/**
 * Log informational message. Suppressed in quiet mode.
 */
export function info(message: string): void {
	if (!quiet) {
		console.log(`${pc.cyan("[ccpm]")} ${message}`);
	}
}

/**
 * Log success message. Suppressed in quiet mode.
 */
export function success(message: string): void {
	if (!quiet) {
		console.log(`${pc.green("[ccpm]")} ${message}`);
	}
}

/**
 * Log warning message. Suppressed in quiet mode.
 */
export function warn(message: string): void {
	if (!quiet) {
		console.error(`${pc.yellow("[ccpm]")} ${pc.yellow("warning:")} ${message}`);
	}
}

/**
 * Log error message. Always shown, even in quiet mode.
 */
export function error(message: string): void {
	console.error(`${pc.red("[ccpm]")} ${pc.red("error:")} ${message}`);
}

/**
 * Log plain message without prefix. Suppressed in quiet mode.
 * Useful for continuation lines or formatted output.
 */
export function plain(message: string): void {
	if (!quiet) {
		console.log(message);
	}
}

export const log = {
	info,
	success,
	warn,
	error,
	plain,
	setQuiet,
	isQuiet,
};
