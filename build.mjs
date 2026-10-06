// Bundles each account into a single Apps Script file: dist/<account>/Code.js
// Config comes from env/<account>.json when the account has one. IDs come from
// the environment (GitHub secrets in CI, a local .env file otherwise):
// the ones of SECRETS below and <ACCOUNT>_SCRIPT_ID.
// Usage: node build.mjs [account...]
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const GLOBAL = "_app";
// First lines of every Code.js, for whoever opens it in the Apps Script editor
const BANNER = `/**
 * apm-hub
 *
 * Generated file: do not edit it here, the next deploy overwrites it.
 * Source: https://github.com/nqhd3v/apm-hub
 * To improve something, open a pull request on that repository.
 * Author: nqhd3v
 */`;
// IDs injected into the bundle of each account: config key -> environment variable
const SECRETS = {
	one: {
		SPREADSHEET_ID: "CALENDAR_SPREADSHEET_ID",
		SHARED_SPREADSHEET_ID: "SHARED_SPREADSHEET_ID",
	},
	two: { SHARED_SPREADSHEET_ID: "SHARED_SPREADSHEET_ID" },
};
// `node build.mjs two` builds one account only; default is all of them
const requested = process.argv.slice(2);
const ACCOUNTS = requested.length ? requested : ["one", "two"];

if (existsSync(".env")) process.loadEnvFile(".env");

function required(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

for (const account of ACCOUNTS) {
	const envFile = `env/${account}.json`;
	const env = {
		...(existsSync(envFile) ? JSON.parse(await readFile(envFile, "utf8")) : {}),
	};
	for (const [key, variable] of Object.entries(SECRETS[account] ?? {})) {
		env[key] = required(variable);
	}
	const scriptId = required(`${account.toUpperCase()}_SCRIPT_ID`);
	const options = {
		entryPoints: [`src/${account}/index.ts`],
		bundle: true,
		target: "es2020",
		write: false,
		outdir: "dist",
		define: { __ENV__: JSON.stringify(env) },
	};

	// Apps Script only runs top-level function declarations, so every export of
	// the entry file gets a global stub that forwards to the bundle.
	const { metafile } = await build({
		...options,
		format: "esm",
		metafile: true,
	});
	const exports = Object.values(metafile.outputs).flatMap((o) => o.exports);
	if (exports.length === 0) throw new Error(`${account}: no entrypoints`);

	const { outputFiles } = await build({
		...options,
		format: "iife",
		globalName: GLOBAL,
	});
	const stubs = exports
		.map(
			(name) =>
				`function ${name}() {\n  return ${GLOBAL}.${name}.apply(this, arguments);\n}`,
		)
		.join("\n");

	const outDir = `dist/${account}`;
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });
	await writeFile(
		`${outDir}/Code.js`,
		`${BANNER}\n${outputFiles[0].text}\n${stubs}\n`,
	);
	await copyFile(`src/${account}/appsscript.json`, `${outDir}/appsscript.json`);
	await writeFile(
		`${outDir}/.clasp.json`,
		JSON.stringify({ scriptId, rootDir: "." }),
	);

	console.log(`${account}: ${exports.join(", ")}`);
}
