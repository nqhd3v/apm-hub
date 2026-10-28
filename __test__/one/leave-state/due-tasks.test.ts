import { describe, expect, test } from "vitest";
import {
	devEmails,
	dueTasksJql,
	groupByAssignee,
	pickJiraUser,
} from "../../../src/one/leave-state/due-tasks";

describe("devEmails", () => {
	test("keeps the members whose role is DEV, ignoring case and spaces", () => {
		const rows: unknown[][] = [
			[" A@one.example ", "101", "A", "DEV", false],
			["b@one.example", "102", "B", " dev ", true],
			["c@one.example", "103", "C", "QC", false],
			["d@one.example", "104", "D", "", false],
			["", "105", "E", "DEV", false],
		];

		expect([...devEmails(rows)]).toEqual(["a@one.example", "b@one.example"]);
	});
});

describe("pickJiraUser", () => {
	const user = (accountId: string, emailAddress?: string) => ({
		accountId,
		emailAddress,
		accountType: "atlassian",
	});

	test("prefers the account with the email", () => {
		expect(
			pickJiraUser(
				[user("1", "x@one.example"), user("2", "A@one.example")],
				"a@one.example",
			)?.accountId,
		).toBe("2");
	});

	test("takes the only person found when emails are hidden", () => {
		expect(
			pickJiraUser(
				[user("1"), { accountId: "app", accountType: "app" }],
				"a@one.example",
			)?.accountId,
		).toBe("1");
		expect(
			pickJiraUser([user("1"), user("2")], "a@one.example"),
		).toBeUndefined();
		expect(pickJiraUser([], "a@one.example")).toBeUndefined();
	});
});

describe("dueTasksJql", () => {
	test("unfinished sub-tasks of the people due on the day", () => {
		expect(dueTasksJql("2026-10-29", ["1", "2"])).toBe(
			'project = "TEST" AND issuetype in subTaskIssueTypes() AND duedate = "2026-10-29" AND statusCategory != Done AND assignee in ("1", "2") ORDER BY key',
		);
	});
});

describe("groupByAssignee", () => {
	test("groups the keys by assignee, skipping unassigned issues", () => {
		const issue = (key: string, accountId?: string) => ({
			key,
			fields: { assignee: accountId ? { accountId } : null },
		});
		const groups = groupByAssignee([
			issue("APM-1", "1"),
			issue("APM-2"),
			issue("APM-3", "1"),
			issue("APM-4", "2"),
		]);

		expect(Object.fromEntries(groups)).toEqual({
			"1": ["APM-1", "APM-3"],
			"2": ["APM-4"],
		});
	});
});
