// Encrypts the incoming webhook of a team space for `config!H` of the shared
// sheet. The secret is WORKLOG_WEBHOOK_SECRET of the environment (or .env),
// the same value as the script property of the `one` project.
// Usage: npm run encrypt-webhook -- <teamKey>, then paste the webhook URL.
import { webcrypto } from "node:crypto";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { encryptWebhook } from "../src/one/worklogs/cipher.ts";

const WEBHOOK = "https://chat.googleapis.com/v1/spaces/";

if (existsSync(".env")) process.loadEnvFile(".env");

const teamKey = process.argv[2]?.trim();
const secret = process.env.WORKLOG_WEBHOOK_SECRET?.trim();
if (!teamKey) {
	console.error("Usage: npm run encrypt-webhook -- <teamKey>");
	process.exit(1);
}
if (!secret) {
	console.error(
		"WORKLOG_WEBHOOK_SECRET is not set. Create one with `openssl rand -base64 32`.",
	);
	process.exit(1);
}

// The URL is read from the prompt, not the arguments, to keep it out of the shell history
const prompt = createInterface({
	input: process.stdin,
	output: process.stderr,
});
const url = (await prompt.question(`Webhook URL of "${teamKey}": `)).trim();
prompt.close();
if (!url.startsWith(WEBHOOK)) {
	console.error(`Not a Google Chat webhook: it must start with ${WEBHOOK}`);
	process.exit(1);
}

const nonce = webcrypto.getRandomValues(new Uint8Array(16));
console.log(encryptWebhook(secret, teamKey, url, nonce));
