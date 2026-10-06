import { CONFIG, type PlanLayout } from "../config";
import {
	formatDateCell,
	formatNumericCell,
	formatPersonCell,
	type Person,
	type SheetRow,
} from "./cells";

export interface PersonLeave extends Person {
	state: number;
}

/**
 * Members with a leave value in the column of `date`.
 * Returns null when the plan sheet has no column for that date.
 */
export function pickLeaveRows(
	rows: SheetRow[],
	date: string,
	layout: PlanLayout,
): PersonLeave[] | null {
	const dateCells = rows[layout.DATE_ROW - 1]?.values ?? [];
	const dateIndex = dateCells.findIndex(
		(cell) => formatDateCell(cell) === date,
	);
	if (dateIndex === -1) return null;

	const states: PersonLeave[] = [];
	rows.forEach(({ values: row = [] }, rowIndex) => {
		const rowNumber = rowIndex + 1;
		if (
			rowNumber < layout.MEMBER_START_ROW ||
			rowNumber > layout.MEMBER_END_ROW ||
			layout.SKIP_ROWS.includes(rowNumber)
		) {
			return;
		}

		const state = formatNumericCell(row[dateIndex]);
		if (state === null) return;

		const person = formatPersonCell(row[layout.MEMBER_NAME_COL - 1]);
		if (!person) return;

		states.push({ ...person, state });
	});

	return states;
}

export function readPlanRows(): SheetRow[] {
	if (!Sheets?.Spreadsheets) {
		throw new Error("Sheets advanced service is not enabled.");
	}

	const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(
		CONFIG.SHEET_NAME,
	);
	if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found.`);
	const rangeA1 = `'${CONFIG.SHEET_NAME}'!${sheet.getDataRange().getA1Notation()}`;

	// Request both chipRuns and effectiveValue to get the actual typed values
	const response = Sheets.Spreadsheets.get(CONFIG.SPREADSHEET_ID, {
		ranges: [rangeA1],
		fields:
			"sheets.data.rowData.values(chipRuns,formattedValue,effectiveValue,effectiveFormat.numberFormat)",
	});

	return (response.sheets?.[0]?.data?.[0]?.rowData ?? []) as SheetRow[];
}
