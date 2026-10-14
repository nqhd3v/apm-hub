import { expect, test } from "vitest";
import { isDevMode } from "../../src/shared/daily-data";
import { spaceOf } from "../../src/two/chat/send";

test("only an explicit DEV flag switches to the test space", () => {
	expect(isDevMode("DEV")).toBe(true);
	expect(isDevMode(" dev ")).toBe(true);
	expect(isDevMode("")).toBe(false);
	expect(isDevMode("PROD")).toBe(false);
	expect(isDevMode(undefined)).toBe(false);
});

test("replies go to the space of their thread", () => {
	expect(spaceOf("spaces/AAA/threads/BBB", "spaces/ROOT")).toBe("spaces/AAA");
	expect(spaceOf("spaces/AAA/messages/CCC", "spaces/ROOT")).toBe("spaces/AAA");
	expect(spaceOf("", "spaces/ROOT")).toBe("spaces/ROOT");
});
