import { DAILY_DATA, MODE_DEV } from "../shared/daily-data";
import { CONFIG } from "./config";

export function getSharedSheet(
	tab: string,
): GoogleAppsScript.Spreadsheet.Sheet {
	const sheet = SpreadsheetApp.openById(
		CONFIG.SHARED_SPREADSHEET_ID,
	).getSheetByName(tab);
	if (!sheet) throw new Error(`Sheet "${tab}" not found.`);

	return sheet;
}

export function getDailyDataSheet(): GoogleAppsScript.Spreadsheet.Sheet {
	return getSharedSheet(DAILY_DATA.TAB);
}

export function isDevMode(flag: unknown): boolean {
	return String(flag).trim().toUpperCase() === MODE_DEV;
}
