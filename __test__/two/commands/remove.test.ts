import { describe, expect, test } from "vitest";
import {
	pickMemberToRemove,
	searchMemberRows,
} from "../../../src/two/commands/members";
import { parseCommand } from "../../../src/two/commands/request";

const rows: unknown[][] = [
	[
		"hung.le@one.example",
		"101",
		"Danto (Hung LE)",
		"hung.lc@two.example",
		false,
	],
	["hung.tran@one.example", "102", "Hung TRAN", "hung.tt@two.example", false],
	["lan.vo@one.example", "103", "Lan VO", "", true],
	["", "", "", "", false],
];

describe("searchMemberRows", () => {
	test("matches part of either email or of the name, ignoring case", () => {
		expect(searchMemberRows(rows, "hung.lc")).toEqual([
			{
				index: 0,
				name: "Danto (Hung LE)",
				oneEmail: "hung.le@one.example",
				inactive: false,
			},
		]);
		expect(searchMemberRows(rows, "HUNG.TRAN@one")).toMatchObject([
			{ index: 1 },
		]);
		expect(searchMemberRows(rows, " danto ")).toMatchObject([{ index: 0 }]);
		expect(searchMemberRows(rows, "lan")).toMatchObject([
			{ index: 2, inactive: true },
		]);
	});

	test("returns every match, and nothing for an empty text", () => {
		expect(searchMemberRows(rows, "hung")).toHaveLength(2);
		expect(searchMemberRows(rows, "nobody")).toEqual([]);
		expect(searchMemberRows(rows, "  ")).toEqual([]);
	});
});

describe("pickMemberToRemove", () => {
	test("removes the only active match", () => {
		expect(pickMemberToRemove(searchMemberRows(rows, "hung.lc"))).toMatchObject(
			{ status: "removed", member: { index: 0 } },
		);
	});

	test("changes nothing when several active members match", () => {
		const result = pickMemberToRemove(searchMemberRows(rows, "hung"));

		expect(result.status).toBe("ambiguous");
	});

	test("ignores inactive rows when an active one matches", () => {
		expect(
			pickMemberToRemove(searchMemberRows(rows, "one.example")).status,
		).toBe("ambiguous");
		expect(pickMemberToRemove(searchMemberRows(rows, "n.vo")).status).toBe(
			"inactive",
		);
	});

	test("reports when nobody matches", () => {
		expect(pickMemberToRemove([])).toEqual({ status: "none" });
	});
});

describe("parseCommand query", () => {
	const user = { name: "users/9", email: "a@two.example" };
	const command = (message: { text?: string; argumentText?: string }) =>
		parseCommand({
			chat: {
				user,
				appCommandPayload: {
					appCommandMetadata: { appCommandId: 2 },
					message,
				},
			},
		});

	test("is the text after the command name", () => {
		expect(command({ text: "/remove hung.lc" })?.query).toBe("hung.lc");
		expect(command({ argumentText: " Cong Hung " })?.query).toBe("Cong Hung");
		expect(command({ text: "/remove" })?.query).toBe("");
	});
});
