import fs from "node:fs";
import path from "node:path";

export function exists(p: string): boolean {
	try {
		fs.accessSync(p);
		return true;
	} catch {
		return false;
	}
}

export function readJson<T>(p: string): T {
	return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function writeJson(p: string, data: unknown): void {
	fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

export function ensureDir(p: string): void {
	fs.mkdirSync(p, { recursive: true });
}

export function rmForce(p: string): void {
	fs.rmSync(p, { recursive: true, force: true });
}

export function isSymlink(p: string): boolean {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
}

export function copyDir(src: string, dst: string): void {
	ensureDir(dst);
	for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, ent.name);
		const d = path.join(dst, ent.name);
		if (ent.isDirectory()) {
			copyDir(s, d);
		} else {
			fs.copyFileSync(s, d);
		}
	}
}
