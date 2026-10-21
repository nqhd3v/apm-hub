import { describe, expect, test } from "vitest";
import {
	createProblemsMessage,
	createWorklogCard,
} from "../../../src/one/worklogs/cards";

const options = {
	date: "13/10/2026",
	jiraUrl: "https://jira",
	searchUrl: "https://jira/search",
};

describe("createWorklogCard", () => {
	test("one short row per member: name, total, issue keys", () => {
		const message = createWorklogCard(
			[
				{
					accountId: "a",
					name: "A <b>",
					seconds: 13.5 * 3600,
					issues: [
						{ key: "APM-1", summary: "long summary", seconds: 12 * 3600 },
						{ key: "APM-2", summary: "fix", seconds: 1.5 * 3600 },
					],
				},
				{
					accountId: "b",
					name: "B",
					seconds: 3600,
					issues: [{ key: "APM-3", summary: "z", seconds: 3600 }],
				},
			],
			options,
		);
		const card = message.cardsV2?.[0]?.card;

		expect(card?.header).toEqual({
			title: "Worklogs in last workday",
			subtitle: "13/10/2026",
		});
		const section = card?.sections[0];
		expect(section?.header).toBe("2 members · 14h 30m logged");
		const [first, second] = section?.widgets ?? [];
		expect(first).toMatchObject({
			decoratedText: {
				text: '<b>A &lt;b&gt;</b> <font color="#188038"><b>13h 30m</b></font><br><a href="https://jira/browse/APM-1">APM-1</a> · <a href="https://jira/browse/APM-2">APM-2</a>',
				icon: { materialIcon: { name: "check_circle" } },
			},
		});
		expect(JSON.stringify(first)).not.toContain("long summary");
		expect(second).toMatchObject({
			decoratedText: { icon: { materialIcon: { name: "schedule" } } },
		});
		expect(JSON.stringify(section)).toContain("https://jira/search");
	});

	test("warns under 2/3 of the working day of Jira", () => {
		const iconOf = (seconds: number, daySeconds: number) =>
			JSON.stringify(
				createWorklogCard(
					[
						{
							accountId: "a",
							name: "A",
							seconds,
							issues: [{ key: "APM-1", summary: "", seconds }],
						},
					],
					{ ...options, daySeconds },
				).cardsV2?.[0]?.card.sections[0]?.widgets[0],
			);

		const hour = 3600;
		// 8h day: warning under 5h 20m
		expect(iconOf(5.5 * hour, 8 * hour)).toContain("check_circle");
		expect(iconOf((16 / 3) * hour, 8 * hour)).toContain("check_circle");
		expect(iconOf(5 * hour, 8 * hour)).toContain("schedule");
		// 6h day: warning under 4h
		expect(iconOf(4 * hour, 6 * hour)).toContain("check_circle");
		expect(iconOf(3.5 * hour, 6 * hour)).toContain("schedule");
	});

	test("names the team in the section header", () => {
		const message = createWorklogCard([], { ...options, team: "AM" });

		expect(message.cardsV2?.[0]?.card.sections[0]?.header).toBe(
			"AM · 0 members · 0h logged",
		);
	});

	test("says so when nobody logged", () => {
		const message = createWorklogCard([], options);
		const card = message.cardsV2?.[0]?.card;

		expect(card?.header?.title).toBe("Worklogs in last workday");
		expect(card?.sections[0]?.header).toBe("0 members · 0h logged");
		expect(JSON.stringify(card)).toContain("No worklog was logged");
	});
});

test("createProblemsMessage lists the problems", () => {
	expect(
		createProblemsMessage("20/10/2026", ["Row 4: x.", 'Team "AM": y']),
	).toEqual({
		text: '*Worklog report of 20/10/2026: 2 problems*\n• Row 4: x.\n• Team "AM": y',
	});
});
