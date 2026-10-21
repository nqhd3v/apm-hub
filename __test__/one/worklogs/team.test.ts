import { expect, test } from "vitest";
import {
	findTeamField,
	groupByTeam,
	TEAM_FIELD_TYPE,
	teamOf,
} from "../../../src/one/worklogs/team";

test("findTeamField picks the Atlassian Teams field", () => {
	const fields = [
		{ id: "summary", name: "Summary" },
		{ id: "customfield_1", name: "Story Points", schema: { custom: "float" } },
		{ id: "customfield_2", name: "Team", schema: { custom: TEAM_FIELD_TYPE } },
	];

	expect(findTeamField(fields)?.id).toBe("customfield_2");
	expect(findTeamField(fields.slice(0, 2))).toBeUndefined();
});

test("teamOf reads id and name, or title", () => {
	expect(teamOf({ id: "t1", name: "AM", title: "AM" })).toEqual({
		id: "t1",
		name: "AM",
	});
	expect(teamOf({ id: "t2", title: "PM" })).toEqual({ id: "t2", name: "PM" });
	expect(teamOf(null)).toBeUndefined();
	expect(teamOf("AM")).toBeUndefined();
	expect(teamOf({ name: "AM" })).toBeUndefined();
});

test("groupByTeam keeps the listed teams, each with an entry", () => {
	const issue = (key: string, team?: object) => ({
		key,
		fields: { customfield_2: team },
	});
	const groups = groupByTeam(
		[
			issue("A-1", { id: "t1", name: "AM" }),
			issue("A-2", { id: "t2", name: "PM" }),
			issue("A-3"),
			issue("A-4", { id: "t1", name: "AM" }),
		],
		"customfield_2",
		["AM", "QA"],
	);

	expect([...groups.keys()]).toEqual(["AM", "QA"]);
	expect(groups.get("AM")?.issues.map((i) => i.key)).toEqual(["A-1", "A-4"]);
	expect(groups.get("AM")?.teamId).toBe("t1");
	expect(groups.get("QA")).toEqual({ issues: [] });
});
