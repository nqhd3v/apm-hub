/** Where members and dates sit in the plan sheet (1-based rows and columns). */
export interface PlanLayout {
	MEMBER_START_ROW: number;
	MEMBER_END_ROW: number;
	MEMBER_NAME_COL: number;
	DATE_ROW: number;
	SKIP_ROWS: readonly number[];
}

/** Shape of `env/one.json`, plus the values the build takes from secrets. */
export interface OneEnv extends PlanLayout {
	/** Plan spreadsheet holding the day-off sheet. From the `CALENDAR_SPREADSHEET_ID` secret */
	SPREADSHEET_ID: string;
	SHEET_NAME: string;
	/** From the `SHARED_SPREADSHEET_ID` secret */
	SHARED_SPREADSHEET_ID: string;
}

/** Injected by the build. */
declare const __ENV__: OneEnv;

export const CONFIG: OneEnv = __ENV__;
