import { CONFIG_DATA } from "../../shared/config-data";
import { DAILY_DATA, isDevMode } from "../../shared/daily-data";
import { CONFIG } from "../config";

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

/** Team name of `config!E3`, or "" for every team. */
export function readWorklogTeam(): string {
	const team = String(
		getSharedSheet(CONFIG_DATA.TAB)
			.getRange(CONFIG_DATA.WORKLOG_TEAM_CELL)
			.getValue() ?? "",
	).trim();
	Logger.log(`Worklog team: "${team}"`);

	return team;
}
