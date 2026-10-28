import { CONFIG_DATA } from "../../shared/config-data";
import { DAILY_DATA, isDevMode } from "../../shared/daily-data";
import { CONFIG, PROPERTY } from "../config";

function getSharedSheet(tab: string): GoogleAppsScript.Spreadsheet.Sheet {
	const sheet = SpreadsheetApp.openById(
		CONFIG.SHARED_SPREADSHEET_ID,
	).getSheetByName(tab);
	if (!sheet) throw new Error(`Sheet "${tab}" not found.`);

	return sheet;
}

/** True while the mode flag of the shared sheet is `DEV`. */
export function readDevMode(): boolean {
	const flag = getSharedSheet(DAILY_DATA.TAB)
		.getRange(DAILY_DATA.MODE_CELL)
		.getValue();
	Logger.log(`Mode flag: "${flag}"`);

	return isDevMode(flag);
}

/** Team name of `config!E3`, or "" for every team of the table. */
export function readWorklogTeam(): string {
	const team = String(
		getSharedSheet(CONFIG_DATA.TAB)
			.getRange(CONFIG_DATA.WORKLOG_TEAM_CELL)
			.getValue() ?? "",
	).trim();
	Logger.log(`Worklog team: "${team}"`);

	return team;
}

/** Cells of the team table, `config!G3:H` */
export function readTeamRows(): unknown[][] {
	return getSharedSheet(CONFIG_DATA.TAB)
		.getRange(CONFIG_DATA.WORKLOG_TEAMS_RANGE)
		.getValues();
}

/** Cells of the member list, `config!A8:E`: `one email | chat id | name | role | inactive` */
export function readMemberRows(): unknown[][] {
	return getSharedSheet(CONFIG_DATA.TAB)
		.getRange(CONFIG_DATA.MEMBERS_RANGE)
		.getValues();
}

/** Secret of the team webhooks. Throws when the script property is not set. */
export function readWebhookSecret(): string {
	const secret = PropertiesService.getScriptProperties().getProperty(
		PROPERTY.WORKLOG_WEBHOOK_SECRET,
	);
	if (!secret) {
		throw new Error(
			`${PROPERTY.WORKLOG_WEBHOOK_SECRET} script property is not set.`,
		);
	}

	return secret;
}
