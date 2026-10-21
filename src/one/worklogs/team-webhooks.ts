/** Row of `config!G3:H`: a Jira team and the encrypted webhook of its space. */
export interface TeamRow {
	/** Sheet row, for the problem report */
	row: number;
	/** Exact name of the Team field in Jira */
	teamKey: string;
	/** Token of `encryptWebhook` */
	webhook: string;
}

export interface Picked {
	teams: TeamRow[];
	/** Rows or settings that could not be used, for the report of the dev space */
	problems: string[];
}

const text = (value: unknown) => String(value ?? "").trim();

/**
 * Rows of the team table, `values` starting at sheet row `firstRow`. Reading
 * stops at the first row with both cells empty; a row with one empty cell,
 * or a team already listed above, is skipped as a problem.
 */
export function parseTeamRows(values: unknown[][], firstRow: number): Picked {
	const teams: TeamRow[] = [];
	const problems: string[] = [];

	for (const [index, cells] of values.entries()) {
		const row = firstRow + index;
		const teamKey = text(cells[0]);
		const webhook = text(cells[1]);
		if (!teamKey && !webhook) break;

		if (!teamKey || !webhook) {
			problems.push(
				`Row ${row}: ${teamKey ? `team "${teamKey}" has no webhook` : "webhook has no team"}.`,
			);
		} else if (teams.some((t) => t.teamKey === teamKey)) {
			problems.push(`Row ${row}: team "${teamKey}" is listed twice.`);
		} else {
			teams.push({ row, teamKey, webhook });
		}
	}

	return { teams, problems };
}

/** The team named `filter` when set, else every team of `teams`. */
export function pickTeams(teams: TeamRow[], filter: string): Picked {
	if (!filter) return { teams, problems: [] };

	const team = teams.find((t) => t.teamKey === filter);
	return team
		? { teams: [team], problems: [] }
		: {
				teams: [],
				problems: [`Team "${filter}" of the filter has no usable row.`],
			};
}
