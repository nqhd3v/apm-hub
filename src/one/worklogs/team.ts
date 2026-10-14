/** Subset of a field of `GET /rest/api/3/field`. */
export interface JiraField {
	id: string;
	name?: string;
	schema?: { custom?: string };
}

/** Custom field type of the Atlassian Teams field, shown as `Team[Team]` in JQL */
export const TEAM_FIELD_TYPE =
	"com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team";

export function findTeamField(fields: JiraField[]): JiraField | undefined {
	return fields.find((f) => f.schema?.custom === TEAM_FIELD_TYPE);
}

export interface Team {
	id: string;
	name: string;
}

/** Team of an issue from the value of its Team field, or undefined when unset. */
export function teamOf(value: unknown): Team | undefined {
	if (!value || typeof value !== "object") return undefined;

	const { id, name, title } = value as {
		id?: unknown;
		name?: unknown;
		title?: unknown;
	};
	const label = typeof name === "string" ? name : title;
	if (typeof id !== "string" || typeof label !== "string") return undefined;

	return { id, name: label };
}
