import { CONFIG_DATA } from "../../shared/config-data";
import { CONFIG } from "../config";
import { createWorklogCard } from "./cards";
import { decryptWebhook } from "./cipher";
import {
	fetchWorkingDaySeconds,
	fetchWorklogs,
	jiraBaseUrl,
	worklogSearchUrl,
} from "./jira";
import { sendToWebhook } from "./send";
import {
	readDevMode,
	readTeamRows,
	readWebhookSecret,
	readWorklogTeam,
} from "./settings";
import { summarizeWorklogs, type Workday } from "./summary";
import { parseTeamRows, pickTeams } from "./team-webhooks";

const message = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

/**
 * Posts one card per team of `config!G3:H` (or only the team of
 * `config!E3`) to the space of that team, or to the test space in dev mode.
 * A team that fails does not stop the others.
 *
 * @returns what went wrong, empty when every team got its card
 */
export function reportWorklogs(day: Workday): string[] {
	const rows = parseTeamRows(
		readTeamRows(),
		CONFIG_DATA.WORKLOG_TEAMS_FIRST_ROW,
	);
	const picked = pickTeams(rows.teams, readWorklogTeam());
	const problems = [...rows.problems, ...picked.problems];
	if (!picked.teams.length) return problems;

	const secret = readWebhookSecret();
	const targets: { team: string; webhook: string }[] = [];
	for (const row of picked.teams) {
		try {
			targets.push({
				team: row.teamKey,
				webhook: decryptWebhook(secret, row.teamKey, row.webhook),
			});
		} catch (error) {
			problems.push(`Row ${row.row} (${row.teamKey}): ${message(error)}`);
		}
	}
	if (!targets.length) return problems;

	const fetched = fetchWorklogs(
		day,
		targets.map((t) => t.team),
	);
	const dev = readDevMode();
	const daySeconds = fetchWorkingDaySeconds();
	for (const { team, webhook } of targets) {
		try {
			const { issues, teamId } = fetched.get(team) ?? { issues: [] };
			const members = summarizeWorklogs(issues, day);
			Logger.log(
				`Worklogs of ${team} on ${day.iso}: ${JSON.stringify(members)}`,
			);
			sendToWebhook(
				createWorklogCard(members, {
					date: day.label,
					jiraUrl: jiraBaseUrl(),
					searchUrl: worklogSearchUrl(day, teamId),
					daySeconds,
					team,
				}),
				dev ? CONFIG.WORKLOG_DEV_WEBHOOK_URL : webhook,
			);
		} catch (error) {
			problems.push(`Team "${team}": ${message(error)}`);
		}
	}

	return problems;
}
