/**
 * Contract of the `daily_data` tab of the shared spreadsheet.
 */
export const TIMEZONE = "Asia/Ho_Chi_Minh";

export const DAILY_DATA = {
	TAB: "daily_data",
	/** A4 holds the date, A5:D100 hold `email | state | session | due task keys` */
	CLEAR_RANGE: "A4:D100",
	ROWS_RANGE: "A5:D100",
	DATE_ROW: 4,
	FIRST_ROW: 5,
	EMAIL_COL: 1,
	SESSION_COL: 3,
	/** Keys of the unfinished sub-tasks due on the leave day, joined with `, ` */
	DUE_TASKS_COL: 4,
	/** E5 message name, E6 thread name, E7 `;`-joined users already replied to */
	MESSAGE_RANGE: "E5:E7",
	MESSAGE_COL: 5,
	MESSAGE_NAME_ROW: 5,
	MESSAGE_THREAD_ROW: 6,
	MESSAGE_SEEN_ROW: 7,
	/** `DEV` here makes the `two` account post to the test space instead of the team space */
	MODE_CELL: "E9",
} as const;

export const LEAVE_FULL = 1;
export const LEAVE_HALF = 0.5;

/** Half-day session: not applicable, waiting for the member, morning, afternoon */
export const SESSION_NONE = -1;
export const SESSION_PENDING = 0;
export const SESSION_MORNING = 1;
export const SESSION_AFTERNOON = 2;

export const MODE_DEV = "DEV";

/** True when the value of `MODE_CELL` is `DEV`. */
export function isDevMode(flag: unknown): boolean {
	return String(flag).trim().toUpperCase() === MODE_DEV;
}

/** Content of a `DUE_TASKS_COL` cell: the issue keys joined with `, `. */
export function formatDueTasks(keys: string[]): string {
	return keys.join(", ");
}

/** Issue keys of a `DUE_TASKS_COL` cell. */
export function parseDueTasks(cell: unknown): string[] {
	return String(cell ?? "")
		.split(",")
		.map((key) => key.trim())
		.filter(Boolean);
}
