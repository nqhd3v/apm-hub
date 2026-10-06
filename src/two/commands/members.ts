import { CONFIG_DATA } from "../../shared/config-data";
import type { ChatUser } from "../chat/types";
import type { Members } from "../settings";
import { getSharedSheet } from "../shared-sheet";

export interface NewMember {
	/** Google Chat user id */
	id: string;
	name: string;
	/** Email on the `one` account, lowercased */
	oneEmail: string;
}

function text(value: unknown): string {
	return String(value ?? "").trim();
}

/** True when the Chat user is an active member, matched by Chat id or by `two` account email. */
export function isMember(members: Members, user: Partial<ChatUser>): boolean {
	const email = user.email?.toLowerCase();

	return Object.values(members).some(
		(member) =>
			user.name === `users/${member.id}` ||
			(!!email && member.email.toLowerCase() === email),
	);
}

/** 0-based index of the row of the Chat user `id`, or -1. */
export function findMemberRow(rows: unknown[][], id: string): number {
	return rows.findIndex((row) => text(row[1]) === id);
}

/** 0-based index of the row `/add` writes to: the member's own row, else the first empty one, else a new one. */
export function pickRowToAdd(rows: unknown[][], member: NewMember): number {
	const own = rows.findIndex(
		(row) =>
			text(row[1]) === member.id ||
			text(row[0]).toLowerCase() === member.oneEmail,
	);
	if (own !== -1) return own;

	const empty = rows.findIndex((row) => !text(row[0]) && !text(row[1]));
	return empty !== -1 ? empty : rows.length;
}

function readMemberRows(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
	return sheet.getRange(CONFIG_DATA.MEMBERS_RANGE).getValues();
}

/** Writes `member` as an active row. Returns true when the row already held a member. */
export function addMember(member: NewMember): boolean {
	const sheet = getSharedSheet(CONFIG_DATA.TAB);
	const rows = readMemberRows(sheet);
	const index = pickRowToAdd(rows, member);
	const row = CONFIG_DATA.MEMBERS_FIRST_ROW + index;
	if (row > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());

	// plain text, otherwise Sheets rounds the long id
	sheet.getRange(row, CONFIG_DATA.MEMBER_ID_COL).setNumberFormat("@");
	sheet
		.getRange(row, 1, 1, 3)
		.setValues([[member.oneEmail, member.id, member.name]]);

	const inactive = sheet.getRange(row, CONFIG_DATA.MEMBER_INACTIVE_COL);
	if (!inactive.getDataValidation()) inactive.insertCheckboxes();
	inactive.setValue(false);

	return text(rows[index]?.[0]) !== "" || text(rows[index]?.[1]) !== "";
}

/** Ticks `Inactive` on the row of the Chat user `id`. Returns false when there is no such row. */
export function removeMember(id: string): boolean {
	const sheet = getSharedSheet(CONFIG_DATA.TAB);
	const index = findMemberRow(readMemberRows(sheet), id);
	if (index === -1) return false;

	sheet
		.getRange(
			CONFIG_DATA.MEMBERS_FIRST_ROW + index,
			CONFIG_DATA.MEMBER_INACTIVE_COL,
		)
		.setValue(true);

	return true;
}
