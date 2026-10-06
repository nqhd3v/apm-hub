import { describe, expect, test } from "vitest";
import type { CommandEvent, CommandMessage } from "../../../src/two/chat/types";
import { createReplyMessage } from "../../../src/two/commands/handle";
import {
	findMemberRow,
	isMember,
	pickRowToAdd,
} from "../../../src/two/commands/members";
import { COMMAND, parseCommand } from "../../../src/two/commands/request";
import { formatStatus } from "../../../src/two/commands/status";
import type { MemberLeave } from "../../../src/two/leave-noti/states";

const user = { name: "users/9", email: "admin@two.example" };
const message: CommandMessage = {
	text: "/add @Bob Bob@One.example",
	argumentText: " @Bob Bob@One.example",
	annotations: [
		{ userMention: { user: { name: "users/app", type: "BOT" } } },
		{
			userMention: {
				user: { name: "users/42", displayName: "Bob", type: "HUMAN" },
			},
		},
	],
	thread: { name: "spaces/AAA/threads/T" },
};

describe("parseCommand", () => {
	test("reads an app command", () => {
		const event: CommandEvent = {
			chat: {
				user,
				appCommandPayload: {
					appCommandMetadata: { appCommandId: 1 },
					message,
				},
			},
		};

		expect(parseCommand(event)).toEqual({
			commandId: COMMAND.ADD,
			user,
			thread: "spaces/AAA/threads/T",
			mention: { id: "42", name: "Bob" },
			email: "bob@one.example",
			query: "@Bob Bob@One.example",
		});
	});

	test("reads a slash command sent as a message", () => {
		const event: CommandEvent = {
			chat: {
				user,
				messagePayload: {
					message: { text: "/status", slashCommand: { commandId: "3" } },
				},
			},
		};

		expect(parseCommand(event)).toMatchObject({
			commandId: COMMAND.STATUS,
			thread: "",
			mention: null,
			email: null,
		});
	});

	test("ignores an event without a command", () => {
		expect(
			parseCommand({
				chat: { user, messagePayload: { message: { text: "hi" } } },
			}),
		).toBeNull();
	});
});

describe("isMember", () => {
	const members = {
		"a@one.example": { id: "101", name: "A", email: "a@two.example" },
		"b@one.example": { id: "102", name: "B", email: "" },
	};

	test("matches an active member by chat id or two email", () => {
		expect(isMember(members, { name: "users/102" })).toBe(true);
		expect(isMember(members, { email: "A@two.example" })).toBe(true);
	});

	test("rejects everyone else", () => {
		expect(
			isMember(members, { name: "users/999", email: "x@two.example" }),
		).toBe(false);
		expect(isMember(members, { name: "users/999", email: "" })).toBe(false);
		expect(isMember(members, {})).toBe(false);
		expect(isMember({}, { name: "users/101" })).toBe(false);
	});
});

describe("member rows", () => {
	const rows: unknown[][] = [
		["a@one.example", "101", "A", "a@two.example", false],
		["", "", "", "", false],
		["c@one.example", "103", "C", "", true],
	];
	const member = (id: string, oneEmail: string) => ({
		id,
		name: "N",
		oneEmail,
	});

	test("add reuses the member's row, then the first empty row, then a new one", () => {
		expect(pickRowToAdd(rows, member("103", "new@one.example"))).toBe(2);
		expect(pickRowToAdd(rows, member("999", "a@one.example"))).toBe(0);
		expect(pickRowToAdd(rows, member("999", "new@one.example"))).toBe(1);
		expect(pickRowToAdd([rows[0] ?? []], member("999", "n@one.example"))).toBe(
			1,
		);
	});

	test("remove finds the row by chat id", () => {
		expect(findMemberRow(rows, "103")).toBe(2);
		expect(findMemberRow(rows, "999")).toBe(-1);
	});
});

describe("formatStatus", () => {
	const leave = (name: string, session: number): MemberLeave => ({
		id: "1",
		name,
		oneEmail: "o",
		twoEmail: "t",
		state: session === -1 ? 1 : 0.5,
		session,
	});

	test("lists the mode, the date and who is off", () => {
		expect(
			formatStatus(
				true,
				"10/07/26",
				{ fullDay: [leave("A", -1)], halfDay: [leave("B", 0), leave("C", 2)] },
				12,
			),
		).toBe(
			[
				"*Mode:* DEV (test space)",
				"*Leave date:* 10/07/26",
				"*Full day (1):* A",
				"*Half day (2):* B (pending), C (afternoon)",
				"*Active members:* 12",
			].join("\n"),
		);
	});

	test("says so when nobody is off", () => {
		const text = formatStatus(false, "", { fullDay: [], halfDay: [] }, 0);

		expect(text).toContain("*Mode:* PRD (team space)");
		expect(text).toContain("*Leave date:* not published yet");
		expect(text).toContain("*Full day (0):* nobody");
	});
});

describe("createReplyMessage", () => {
	const request = { user, thread: "spaces/AAA/threads/T" };

	test("is private to the sender by default", () => {
		expect(createReplyMessage({ text: "hi" }, request)).toEqual({
			text: "hi",
			privateMessageViewer: { name: "users/9" },
			thread: { name: "spaces/AAA/threads/T" },
		});
	});

	test("is visible to the space when asked", () => {
		expect(
			createReplyMessage(
				{ text: "hi", visibleToAll: true },
				{ user, thread: "" },
			),
		).toEqual({ text: "hi" });
	});
});
