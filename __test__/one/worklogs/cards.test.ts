import { describe, expect, test } from "vitest";
import { createWorklogCard } from "../../../src/one/worklogs/cards";

describe("createWorklogCard", () => {
	test("one row per member, highlights a short day", () => {
		const message = createWorklogCard(
			[
				{
					accountId: "a",
					name: "A <b>",
					seconds: 8 * 3600,
					issues: [{ key: "APM-1", summary: "x & y", seconds: 8 * 3600 }],
				},
				{
					accountId: "b",
					name: "B",
					seconds: 3600,
					issues: [{ key: "APM-2", summary: "z", seconds: 3600 }],
				},
			],
			"13/10/2026",
			"https://jira",
			"https://jira/search",
		);
		const card = message.cardsV2?.[0]?.card;

		expect(card?.header).toEqual({
			title: "Worklogs in last workday",
			subtitle: "13/10/2026",
		});
		const section = card?.sections[0];
		expect(section?.header).toBe("2 members · 9h logged");
		const [first, second] = section?.widgets ?? [];
		expect(first).toMatchObject({
			decoratedText: { icon: { materialIcon: { name: "check_circle" } } },
		});
		expect(JSON.stringify(first)).toContain("A &lt;b&gt;");
		expect(JSON.stringify(first)).toContain("x &amp; y");
		expect(JSON.stringify(first)).toContain("https://jira/browse/APM-1");
		expect(second).toMatchObject({
			decoratedText: { icon: { materialIcon: { name: "schedule" } } },
		});
		expect(JSON.stringify(section)).toContain("https://jira/search");
	});

	test("says so when nobody logged, and marks dev", () => {
		const message = createWorklogCard([], "13/10/2026", "j", "u", true);
		const card = message.cardsV2?.[0]?.card;

		expect(card?.header?.title).toBe("[DEV] Worklogs in last workday");
		expect(card?.sections[0]?.header).toBe("0 members · 0h logged");
		expect(JSON.stringify(card)).toContain("No worklog was logged");
	});
});
