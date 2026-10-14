import { describe, expect, test } from "vitest";
import { createWorklogCard } from "../../../src/one/worklogs/cards";

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

	test("names the team in the section header", () => {
		const message = createWorklogCard([], { ...options, team: "AM" });

		expect(message.cardsV2?.[0]?.card.sections[0]?.header).toBe(
			"AM · 0 members · 0h logged",
		);
	});

	test("says so when nobody logged, and marks dev", () => {
		const message = createWorklogCard([], { ...options, dev: true });
		const card = message.cardsV2?.[0]?.card;

		expect(card?.header?.title).toBe("[DEV] Worklogs in last workday");
		expect(card?.sections[0]?.header).toBe("0 members · 0h logged");
		expect(JSON.stringify(card)).toContain("No worklog was logged");
	});
});
