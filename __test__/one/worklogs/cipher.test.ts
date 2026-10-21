import { describe, expect, test } from "vitest";
import {
	decryptWebhook,
	encryptWebhook,
	hmacSha256,
	sha256,
	utf8Decode,
	utf8Encode,
} from "../../../src/one/worklogs/cipher";

const hex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const URL =
	"https://chat.googleapis.com/v1/spaces/AAA/messages?key=k-1&token=abc%3D";
const nonce = (seed: number) =>
	Uint8Array.from({ length: 16 }, (_, i) => (seed * 31 + i * 7) & 255);

describe("sha256 and hmacSha256", () => {
	test("FIPS 180-2 vectors", () => {
		expect(hex(sha256(utf8Encode("")))).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
		expect(hex(sha256(utf8Encode("abc")))).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
		// 56 bytes: the length goes into a second block
		expect(
			hex(
				sha256(
					utf8Encode(
						"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
					),
				),
			),
		).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
	});

	test("RFC 4231 vectors", () => {
		expect(
			hex(hmacSha256(new Uint8Array(20).fill(0x0b), utf8Encode("Hi There"))),
		).toBe("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
		expect(
			hex(
				hmacSha256(
					utf8Encode("Jefe"),
					utf8Encode("what do ya want for nothing?"),
				),
			),
		).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
		// key longer than a block is hashed first
		expect(
			hex(
				hmacSha256(
					new Uint8Array(131).fill(0xaa),
					utf8Encode("Test Using Larger Than Block-Size Key - Hash Key First"),
				),
			),
		).toBe("60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
	});
});

test("utf8 round trip", () => {
	const text = "Đội AM 🚀 ç";
	expect(utf8Decode(utf8Encode(text))).toBe(text);
	expect(Array.from(utf8Encode("é"))).toEqual([0xc3, 0xa9]);
});

describe("webhook tokens", () => {
	test("open with the secret on the row of their team", () => {
		const token = encryptWebhook("s3cret", "AM", URL, nonce(1));
		expect(token.startsWith("v1.")).toBe(true);
		expect(token).not.toContain("chat.googleapis");
		expect(decryptWebhook("s3cret", "AM", token)).toBe(URL);
		expect(
			decryptWebhook(
				"s3cret",
				"Đội 1",
				encryptWebhook("s3cret", "Đội 1", URL, nonce(2)),
			),
		).toBe(URL);
	});

	test("differ for each nonce", () => {
		expect(encryptWebhook("s", "AM", URL, nonce(1))).not.toBe(
			encryptWebhook("s", "AM", URL, nonce(2)),
		);
	});

	test("refuse another secret, an edit, another team, or plain text", () => {
		const token = encryptWebhook("s3cret", "AM", URL, nonce(1));
		expect(() => decryptWebhook("other", "AM", token)).toThrow(
			/another secret/,
		);
		const last = token.charAt(token.length - 3) === "A" ? "B" : "A";
		const edited = `${token.slice(0, -3)}${last}${token.slice(-2)}`;
		expect(() => decryptWebhook("s3cret", "AM", edited)).toThrow(/edited/);
		expect(() => decryptWebhook("s3cret", "PM", token)).toThrow(
			/belongs to team "AM"/,
		);
		expect(() => decryptWebhook("s3cret", "AM", URL)).toThrow(
			/not an encrypted/,
		);
		expect(() => decryptWebhook("s3cret", "AM", "v1.@@@@")).toThrow(
			/not an encrypted/,
		);
		expect(() => decryptWebhook("", "AM", token)).toThrow(/secret is empty/);
	});
});
