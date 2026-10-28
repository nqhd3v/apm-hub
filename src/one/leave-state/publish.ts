import {
	DAILY_DATA,
	formatDueTasks,
	LEAVE_FULL,
	SESSION_NONE,
	SESSION_PENDING,
} from "../../shared/daily-data";
import { CONFIG } from "../config";
import type { PersonLeave } from "./plan";

/**
 * Replaces the content of the shared sheet with the leave states of `date`
 * (`MM/DD/YY`) and the keys of the unfinished sub-tasks due that day, by
 * lowercased email.
 */
export function updateSharedSheet(
	states: PersonLeave[],
	date: string,
	dueTasks: Map<string, string[]> = new Map(),
): void {
	const sheet = SpreadsheetApp.openById(
		CONFIG.SHARED_SPREADSHEET_ID,
	).getSheetByName(DAILY_DATA.TAB);
	if (!sheet) throw new Error(`Sheet "${DAILY_DATA.TAB}" not found.`);

	sheet.getRange(DAILY_DATA.CLEAR_RANGE).clearContent();

	// leading apostrophe keeps the date as plain text
	sheet.getRange(DAILY_DATA.DATE_ROW, 1).setValue(`'${date}`);
	if (states.length === 0) return;

	sheet
		.getRange(DAILY_DATA.FIRST_ROW, 1, states.length, DAILY_DATA.DUE_TASKS_COL)
		.setValues(
			states.map((row) => [
				row.email,
				row.state,
				row.state === LEAVE_FULL ? SESSION_NONE : SESSION_PENDING,
				formatDueTasks(dueTasks.get(row.email.toLowerCase()) ?? []),
			]),
		);
}
