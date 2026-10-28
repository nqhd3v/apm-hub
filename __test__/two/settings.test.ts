import { describe, expect, test } from "vitest";
import { parseMembers, parseSettings } from "../../src/two/settings";

const memberRows: unknown[][] = [
	[" a@one.example ", "101", "A", "DEV", false],
	["b@one.example", "102", "B", "QC", true],
	["d@one.example", "104", "D", "SM", "true"],
	["c@one.example", "", "C", "PPO", false],
	["", "", "", "", false],
];

describe("parseMembers", () => {
	test("keeps active rows that have an email and a chat id", () => {
		expect(parseMembers(memberRows)).toEqual({
			"a@one.example": { id: "101", name: "A" },
		});
	});
});

describe("parseSettings", () => {
	test("prefixes the space ids", () => {
		expect(
			parseSettings(["", "ROOT", " DEV ", "users/1"], memberRows),
		).toMatchObject({
			rootSpace: "spaces/ROOT",
			devSpace: "spaces/DEV",
			managerUser: "users/1",
		});
	});

	test("fails on a missing space id, the manager is optional", () => {
		expect(() => parseSettings(["", "", "DEV", ""], [])).toThrow("Team space");
		expect(() => parseSettings(["", "ROOT", "", ""], [])).toThrow("Test space");
		expect(parseSettings(["", "ROOT", "DEV", ""], []).managerUser).toBe("");
	});
});
