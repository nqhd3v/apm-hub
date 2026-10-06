import { describe, expect, test } from "vitest";
import type { Reaction } from "../../../src/two/chat/types";
import {
	createMessageLeaveCard,
	HALF_DAY_ACTION,
} from "../../../src/two/leave-noti/cards";
import { checkUserRequest } from "../../../src/two/leave-noti/half-day";
import { findBadReactors } from "../../../src/two/leave-noti/reactions";
import {
	findHalfDayRow,
	type MemberLeave,
	parseLeaveRows,
} from "../../../src/two/leave-noti/states";
import type { Members } from "../../../src/two/settings";

const member = (key: string) => ({
	oneEmail: `${key}@one.example`,
	email: `${key}@two.example`,
});
const [a, b, c] = [member("a"), member("b"), member("c")];
const members: Members = Object.fromEntries(
	[a, b, c].map(({ oneEmail, email }, index) => [
		oneEmail,
		{ id: String(index + 1), name: email, email },
	]),
);

const rows: unknown[][] = [
	[a.oneEmail, 1, -1],
	[b.oneEmail, 0.5, 0],
	[c.oneEmail, 0.5, 2],
	["stranger@one.example", 0.5, 0],
	["", "", ""],
];

describe("parseLeaveRows", () => {
	test("splits full and half day, skips unknown and empty rows", () => {
		const { fullDay, halfDay } = parseLeaveRows(rows, members);

		expect(fullDay).toMatchObject([
			{ oneEmail: a.oneEmail, twoEmail: a.email, state: 1, session: -1 },
		]);
		expect(halfDay).toMatchObject([
			{ oneEmail: b.oneEmail, twoEmail: b.email, session: 0 },
			{ oneEmail: c.oneEmail, twoEmail: c.email, session: 2 },
		]);
	});
});

describe("findHalfDayRow", () => {
	test("matches by `one` or `two` email, only on half-day rows", () => {
		expect(findHalfDayRow(rows, b.oneEmail, members)).toBe(1);
		expect(findHalfDayRow(rows, c.email, members)).toBe(2);
		expect(findHalfDayRow(rows, a.email, members)).toBe(-1);
		expect(findHalfDayRow(rows, "nobody@two.example", members)).toBe(-1);
	});
});

describe("checkUserRequest", () => {
	const { halfDay } = parseLeaveRows(rows, members);
	const date = "10/05/26";
	const ok = { email: b.email, session: "1", date };

	test("accepts a pending member by `two` or `one` email", () => {
		expect(checkUserRequest(ok, date, halfDay)).toBeNull();
		expect(
			checkUserRequest({ ...ok, email: b.oneEmail }, date, halfDay),
		).toBeNull();
	});

	test("accepts a pending member by chat id, without an email", () => {
		const byId = { userName: "users/2", session: "1", date };

		expect(checkUserRequest(byId, date, halfDay)).toBeNull();
		expect(
			checkUserRequest({ ...byId, userName: "users/1" }, date, halfDay),
		).toBe("notRegistered");
	});

	test("rejects", () => {
		expect(checkUserRequest({ ...ok, session: "3" }, date, halfDay)).toBe(
			"invalidSession",
		);
		expect(checkUserRequest({ ...ok, session: undefined }, date, halfDay)).toBe(
			"invalidSession",
		);
		expect(checkUserRequest({ ...ok, date: "10/04/26" }, date, halfDay)).toBe(
			"invalidDate",
		);
		expect(checkUserRequest({ ...ok, email: a.email }, date, halfDay)).toBe(
			"notRegistered",
		);
		expect(checkUserRequest({ ...ok, email: c.email }, date, halfDay)).toBe(
			"alreadyConfirmed",
		);
	});
});

describe("createMessageLeaveCard", () => {
	const person = (session: number, state = 0.5): MemberLeave => ({
		id: "1",
		name: "N",
		oneEmail: "o",
		twoEmail: "c",
		state,
		session,
	});
	const sectionsOf = (full: MemberLeave[], half: MemberLeave[]) =>
		createMessageLeaveCard(full, half, "10/05/26")?.cardsV2?.[0]?.card
			.sections ?? [];

	test("null when nobody is off", () => {
		expect(createMessageLeaveCard([], [], "10/05/26")).toBeNull();
	});

	test("dev card is marked in the title", () => {
		const title = (dev: boolean) =>
			createMessageLeaveCard([person(-1, 1)], [], "10/05/26", dev)?.cardsV2?.[0]
				?.card.header?.title;

		expect(title(false)).toBe("📢 Tomorrow's leave reminder");
		expect(title(true)).toBe("[DEV] 📢 Tomorrow's leave reminder");
	});

	test("header counts everyone", () => {
		const card = createMessageLeaveCard(
			[person(-1, 1)],
			[person(1)],
			"10/05/26",
		);
		expect(card?.cardsV2?.[0]?.card.header?.subtitle).toBe(
			"10/05/26 — 2 members off",
		);
	});

	test("action section only while a session is pending", () => {
		expect(sectionsOf([person(-1, 1)], [person(1)])).toHaveLength(2);

		const sections = sectionsOf([], [person(0)]);
		expect(sections).toHaveLength(2);
		expect(JSON.stringify(sections[1])).toContain(HALF_DAY_ACTION);
		expect(JSON.stringify(sections[1])).toContain("1</b> member still needs");
	});

	test("collapses lists longer than 5", () => {
		const five = sectionsOf(Array(5).fill(person(-1, 1)), [])[0];
		const six = sectionsOf(Array(6).fill(person(-1, 1)), [])[0];

		expect(five?.collapsible).toBe(false);
		expect(six?.collapsible).toBe(true);
		expect(six?.uncollapsibleWidgetsCount).toBe(3);
	});
});

describe("findBadReactors", () => {
	const reaction = (
		name: string,
		unicode: string,
		type = "HUMAN",
	): Reaction => ({
		user: { name, type },
		emoji: { unicode },
	});

	test("keeps new human negative reactions, once per user", () => {
		const reactions = [
			reaction("users/1", "👎"),
			reaction("users/1", "😡"),
			reaction("users/2", "👍"),
			reaction("users/3", "👎", "BOT"),
			reaction("users/4", "😢"),
		];

		expect(findBadReactors(reactions, ["users/4"])).toEqual(["users/1"]);
	});
});
