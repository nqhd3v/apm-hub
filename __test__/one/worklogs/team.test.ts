import { expect, test } from "vitest";
import {
	findTeamField,
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
