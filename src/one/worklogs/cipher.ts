/**
 * Encryption of the team webhooks kept in `config!H` of the shared sheet, so
 * that people who can read the sheet cannot post to the team spaces. The
 * secret is the `WORKLOG_WEBHOOK_SECRET` script property of `one`.
 *
 * Apps Script has no cipher, so this is a stream cipher over HMAC-SHA256,
 * written without imports: the same file runs in Apps Script, in the tests
 * and in `scripts/encrypt-webhook.mjs`.
 *
 * Token: `v1.` + base64(nonce | ciphertext | tag), where the ciphertext is
 * `{url}#{teamKey}` XOR the keystream `HMAC(encKey, nonce | counter)` and the
 * tag is `HMAC(macKey, nonce | ciphertext)`. A token only opens with its
 * secret, unedited, on the row of its own team.
 */

const PREFIX = "v1.";
const NONCE_BYTES = 16;
const TAG_BYTES = 16;

// biome-ignore format: table of constants
const K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

function concat(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

export function sha256(data: Uint8Array): Uint8Array {
	const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
	padded.set(data);
	padded[data.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padded.length - 8, Math.floor(data.length / 0x20000000));
	view.setUint32(padded.length - 4, data.length * 8);

	// biome-ignore format: initial hash values
	const h = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);
	const w = new Uint32Array(64);
	for (let offset = 0; offset < padded.length; offset += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
		for (let i = 16; i < 64; i++) {
			const x = w[i - 15] as number;
			const y = w[i - 2] as number;
			const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
			const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
			w[i] = (w[i - 16] as number) + s0 + (w[i - 7] as number) + s1;
		}

		const at = (i: number) => h[i] as number;
		let a = at(0);
		let b = at(1);
		let c = at(2);
		let d = at(3);
		let e = at(4);
		let f = at(5);
		let g = at(6);
		let hh = at(7);
		for (let i = 0; i < 64; i++) {
			const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			const t1 = (hh + s1 + ch + (K[i] as number) + (w[i] as number)) | 0;
			const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (s0 + maj) | 0;
			hh = g;
			g = f;
			f = e;
			e = (d + t1) | 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) | 0;
		}
		[a, b, c, d, e, f, g, hh].forEach((v, i) => {
			h[i] = (h[i] as number) + v;
		});
	}

	const out = new Uint8Array(32);
	const outView = new DataView(out.buffer);
	h.forEach((v, i) => {
		outView.setUint32(i * 4, v);
	});
	return out;
}

export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
	const block = new Uint8Array(64);
	block.set(key.length > 64 ? sha256(key) : key);
	const inner = block.map((b) => b ^ 0x36);
	const outer = block.map((b) => b ^ 0x5c);
	return sha256(concat(outer, sha256(concat(inner, data))));
}

/** UTF-8 bytes of `text`. Apps Script has no `TextEncoder`. */
export function utf8Encode(text: string): Uint8Array {
	const escaped = encodeURIComponent(text);
	const bytes: number[] = [];
	for (let i = 0; i < escaped.length; i++) {
		if (escaped[i] === "%") {
			bytes.push(Number.parseInt(escaped.slice(i + 1, i + 3), 16));
			i += 2;
		} else {
			bytes.push(escaped.charCodeAt(i));
		}
	}
	return new Uint8Array(bytes);
}

/** Text of UTF-8 `bytes`. Throws on invalid UTF-8. */
export function utf8Decode(bytes: Uint8Array): string {
	return decodeURIComponent(
		Array.from(bytes, (b) => `%${b.toString(16).padStart(2, "0")}`).join(""),
	);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Encode(bytes: Uint8Array): string {
	let out = "";
	for (let i = 0; i < bytes.length; i += 3) {
		const n =
			((bytes[i] as number) << 16) |
			((bytes[i + 1] ?? 0) << 8) |
			(bytes[i + 2] ?? 0);
		out += B64[(n >> 18) & 63];
		out += B64[(n >> 12) & 63];
		out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
		out += i + 2 < bytes.length ? B64[n & 63] : "=";
	}
	return out;
}

/** Bytes of base64 `text`, or undefined when it is not base64. */
function base64Decode(text: string): Uint8Array | undefined {
	if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
		return undefined;
	}
	const pad = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
	const out = new Uint8Array((text.length / 4) * 3 - pad);
	let o = 0;
	for (let i = 0; i < text.length; i += 4) {
		let n = 0;
		for (let j = 0; j < 4; j++) {
			const c = text[i + j] as string;
			n = (n << 6) | (c === "=" ? 0 : B64.indexOf(c));
		}
		for (const shift of [16, 8, 0]) {
			if (o < out.length) out[o++] = (n >> shift) & 255;
		}
	}
	return out;
}

function keys(secret: string) {
	if (!secret) throw new Error("The webhook secret is empty.");
	const raw = utf8Encode(secret);
	return {
		enc: hmacSha256(raw, utf8Encode("worklog-webhook:enc")),
		mac: hmacSha256(raw, utf8Encode("worklog-webhook:mac")),
	};
}

/** XOR of `data` with the keystream of `nonce`. Encrypts and decrypts. */
function xorStream(key: Uint8Array, nonce: Uint8Array, data: Uint8Array) {
	const out = new Uint8Array(data.length);
	const counter = new Uint8Array(4);
	const view = new DataView(counter.buffer);
	for (let block = 0; block * 32 < data.length; block++) {
		view.setUint32(0, block);
		const stream = hmacSha256(key, concat(nonce, counter));
		for (let i = 0; i < 32 && block * 32 + i < data.length; i++) {
			const at = block * 32 + i;
			out[at] = (data[at] as number) ^ (stream[i] as number);
		}
	}
	return out;
}

function tagOf(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array) {
	return hmacSha256(key, concat(nonce, ciphertext)).slice(0, TAG_BYTES);
}

/** Token of `url` for the row of `teamKey`. `nonce` must be 16 random bytes, new for each token. */
export function encryptWebhook(
	secret: string,
	teamKey: string,
	url: string,
	nonce: Uint8Array,
): string {
	if (nonce.length !== NONCE_BYTES) {
		throw new Error(`The nonce must be ${NONCE_BYTES} bytes.`);
	}
	const { enc, mac } = keys(secret);
	const ciphertext = xorStream(enc, nonce, utf8Encode(`${url}#${teamKey}`));
	return `${PREFIX}${base64Encode(concat(nonce, ciphertext, tagOf(mac, nonce, ciphertext)))}`;
}

/** Webhook URL of the token of `teamKey`. Throws when the token does not open. */
export function decryptWebhook(
	secret: string,
	teamKey: string,
	token: string,
): string {
	const raw = token.startsWith(PREFIX)
		? base64Decode(token.slice(PREFIX.length))
		: undefined;
	if (!raw || raw.length <= NONCE_BYTES + TAG_BYTES) {
		throw new Error("The webhook is not an encrypted token.");
	}

	const { enc, mac } = keys(secret);
	const nonce = raw.slice(0, NONCE_BYTES);
	const ciphertext = raw.slice(NONCE_BYTES, raw.length - TAG_BYTES);
	const tag = raw.slice(raw.length - TAG_BYTES);
	const expected = tagOf(mac, nonce, ciphertext);
	let diff = 0;
	expected.forEach((b, i) => {
		diff |= b ^ (tag[i] as number);
	});
	if (diff !== 0) {
		throw new Error(
			"The webhook token was edited or made with another secret.",
		);
	}

	const plain = utf8Decode(xorStream(enc, nonce, ciphertext));
	const at = plain.lastIndexOf("#");
	if (plain.slice(at + 1) !== teamKey) {
		throw new Error(
			`The webhook token belongs to team "${plain.slice(at + 1)}".`,
		);
	}
	return plain.slice(0, at);
}
