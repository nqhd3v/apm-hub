import { describe, expect, test } from "vitest";
import {
	parseTeamRows,
	pickTeams,
} from "../../../src/one/worklogs/team-webhooks";

describe("parseTeamRows", () => {
	test("stops at the first empty row, skips incomplete rows", () => {
		const { teams, problems } = parseTeamRows(
			[
				[" AM ", "v1.a"],
				["PM", ""],
				["", ""],
				["QA", "v1.c"],
			],
			3,
		);

		expect(teams).toEqual([{ row: 3, teamKey: "AM", webhook: "v1.a" }]);
		expect(problems).toEqual(['Row 4: team "PM" has no webhook.']);
	});

	test("reports a webhook without team and a team listed twice", () => {
		const { teams, problems } = parseTeamRows(
			[
				["AM", "v1.a"],
				["", "v1.b"],
				["AM", "v1.c"],
				[null, undefined],
			],
			3,
		);

		expect(teams.map((t) => t.row)).toEqual([3]);
		expect(problems).toEqual([
			"Row 4: webhook has no team.",
			'Row 5: team "AM" is listed twice.',
		]);
	});

	test("an empty table has no team and no problem", () => {
		expect(parseTeamRows([], 3)).toEqual({ teams: [], problems: [] });
		expect(parseTeamRows([["", ""]], 3)).toEqual({ teams: [], problems: [] });
	});
});

describe("pickTeams", () => {
	const teams = [
		{ row: 3, teamKey: "AM", webhook: "v1.a" },
		{ row: 4, teamKey: "PM", webhook: "v1.b" },
	];

	test("every team without filter", () => {
		expect(pickTeams(teams, "")).toEqual({ teams, problems: [] });
	});

	test("only the team of the filter", () => {
		expect(pickTeams(teams, "PM").teams).toEqual([teams[1]]);
	});

	test("a filter without row is a problem", () => {
		expect(pickTeams(teams, "QA")).toEqual({
			teams: [],
			problems: ['Team "QA" of the filter has no usable row.'],
		});
	});
});
