import {
	DAILY_DATA,
	LEAVE_FULL,
	LEAVE_HALF,
	parseDueTasks,
	SESSION_NONE,
} from "../../shared/daily-data";
import { formatDate } from "../../shared/date";
import { getSettings, type Members } from "../settings";
import { getDailyDataSheet } from "../shared-sheet";

export interface MemberLeave {
	/** Chat user id */
	id: string;
	name: string;
	oneEmail: string;
	state: number;
	session: number;
	/** Keys of the unfinished sub-tasks due on the leave day, `DEV` members only */
	dueTasks: string[];
}

export interface LeaveStates {
	fullDay: MemberLeave[];
	halfDay: MemberLeave[];
}

/** True when `leave` belongs to the Chat user (`users/{id}`) or to their `one` email. */
export function ownsLeave(
	leave: MemberLeave,
	user: { name?: string; email?: string },
): boolean {
	if (user.name && user.name === `users/${leave.id}`) return true;

	return !!user.email && user.email === leave.oneEmail;
}

/** Splits `email | state | session | due tasks` rows into full-day and half-day leaves of known members. */
export function parseLeaveRows(
	rows: unknown[][],
	members: Members,
): LeaveStates {
	const fullDay: MemberLeave[] = [];
	const halfDay: MemberLeave[] = [];

	for (const row of rows) {
		const oneEmail = String(row[0] ?? "").trim();
		const member = members[oneEmail];
		if (!member) continue;

		const state = Number(row[1]);
		const leave: MemberLeave = {
			id: member.id,
			name: member.name,
			oneEmail,
			state,
			session: state === LEAVE_HALF ? Number(row[2]) : SESSION_NONE,
			dueTasks: parseDueTasks(row[DAILY_DATA.DUE_TASKS_COL - 1]),
		};

		if (state === LEAVE_FULL) fullDay.push(leave);
		if (state === LEAVE_HALF && leave.session >= 0) halfDay.push(leave);
	}

	return { fullDay, halfDay };
}

/** 0-based index of the half-day row of `email` (address on the `one` account), or -1. */
export function findHalfDayRow(rows: unknown[][], email: string): number {
	return rows.findIndex((row) => {
		const oneEmail = String(row[0] ?? "").trim();
		return oneEmail !== "" && row[1] === LEAVE_HALF && oneEmail === email;
	});
}

export function getLeavingStatesFromSharedSheet(): LeaveStates & {
	date: string;
} {
	const sheet = getDailyDataSheet();
	const rows = sheet.getRange(DAILY_DATA.ROWS_RANGE).getValues();
	const date: unknown = sheet.getRange(DAILY_DATA.DATE_ROW, 1).getValue();

	Logger.log(`Leaving state: ${JSON.stringify(rows.filter((r) => r[0]))}`);

	return {
		...parseLeaveRows(rows, getSettings().members),
		date: date instanceof Date ? formatDate(date) : String(date),
	};
}

export function updateSessionByEmail(email: string, session: number): void {
	const sheet = getDailyDataSheet();
	const rows = sheet.getRange(DAILY_DATA.ROWS_RANGE).getValues();

	const rowIndex = findHalfDayRow(rows, email);
	if (rowIndex === -1) {
		Logger.log(
			` - Cannot update session because no row with email ("${email}")`,
		);
		return;
	}

	const row = DAILY_DATA.FIRST_ROW + rowIndex;
	Logger.log(
		` - Update session ("${session}") at row [${row},${DAILY_DATA.SESSION_COL}]`,
	);
	sheet.getRange(row, DAILY_DATA.SESSION_COL).setValue(session);
}
