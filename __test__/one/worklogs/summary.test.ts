import { describe, expect, test } from "vitest";
import {
	formatDuration,
	getLastWorkday,
	type IssueWorklogs,
	isWeekend,
	parseJiraDate,
	summarizeWorklogs,
	workingDaySeconds,
} from "../../../src/one/worklogs/summary";

/** `hour` o'clock of 2026-10-`day` in Asia/Ho_Chi_Minh */
const local = (day: number, hour = 8) => Date.UTC(2026, 9, day, hour - 7);

describe("getLastWorkday", () => {
	test("is yesterday from Tuesday to Friday", () => {
		// Wednesday 2026-10-14, 08:50
		const day = getLastWorkday(local(14, 8));
		expect(day).toMatchObject({ label: "13/10/2026", iso: "2026-10-13" });
		expect(day.start).toBe(local(13, 0));
		expect(day.end).toBe(local(14, 0));
	});

	test("is Friday on Monday", () => {
		expect(getLastWorkday(local(12)).label).toBe("09/10/2026");
	});

	test("uses the local date just after midnight", () => {
		// 2026-10-14 00:30 local is still 10-13 in UTC
		expect(getLastWorkday(local(14, 0) + 30 * 60 * 1000).iso).toBe(
			"2026-10-13",
		);
	});
});

test("isWeekend", () => {
	expect(isWeekend(local(10))).toBe(true);
	expect(isWeekend(local(11))).toBe(true);
	expect(isWeekend(local(12))).toBe(false);
});

test("formatDuration", () => {
	expect(formatDuration(0)).toBe("0h");
	expect(formatDuration(2700)).toBe("45m");
	expect(formatDuration(7200)).toBe("2h");
	expect(formatDuration(5400)).toBe("1h 30m");
});

test("parseJiraDate accepts offsets without colon", () => {
	expect(parseJiraDate("2026-10-13T09:00:00.000+0700")).toBe(local(13, 9));
});

describe("summarizeWorklogs", () => {
	const a = { accountId: "a", displayName: "Person A" };
	const b = { accountId: "b", displayName: "Person B" };
	const log = (author: typeof a, started: string, seconds: number) => ({
		author,
		started,
		timeSpentSeconds: seconds,
	});
	const issues: IssueWorklogs[] = [
		{
			key: "APM-1",
			summary: "Login",
			worklogs: [
				log(a, "2026-10-13T09:00:00.000+0700", 3600),
				log(a, "2026-10-13T14:00:00.000+0700", 1800),
				log(b, "2026-10-13T10:00:00.000+0700", 14400),
				// other days are left out
				log(a, "2026-10-12T23:59:00.000+0700", 3600),
				log(a, "2026-10-14T00:00:00.000+0700", 3600),
			],
		},
		{
			key: "APM-2",
			summary: "Logout",
			// 2026-10-13 07:00 in Asia/Ho_Chi_Minh
			worklogs: [log(a, "2026-10-13T00:00:00.000+0000", 7200)],
		},
	];

	test("totals per member and issue, most time first", () => {
		const members = summarizeWorklogs(issues, getLastWorkday(local(14)));

		expect(members).toEqual([
			{
				accountId: "b",
				name: "Person B",
				seconds: 14400,
				issues: [{ key: "APM-1", summary: "Login", seconds: 14400 }],
			},
			{
				accountId: "a",
				name: "Person A",
				seconds: 12600,
				issues: [
					{ key: "APM-2", summary: "Logout", seconds: 7200 },
					{ key: "APM-1", summary: "Login", seconds: 5400 },
				],
			},
		]);
	});
});

test("workingDaySeconds reads Jira's working day, else 8h", () => {
	const config = (hours: unknown) => ({
		timeTrackingConfiguration: { workingHoursPerDay: hours },
	});

	expect(workingDaySeconds(config(7.5))).toBe(7.5 * 3600);
	expect(workingDaySeconds(config(0))).toBe(8 * 3600);
	expect(workingDaySeconds(config("8"))).toBe(8 * 3600);
	expect(workingDaySeconds({})).toBe(8 * 3600);
	expect(workingDaySeconds(null)).toBe(8 * 3600);
});
