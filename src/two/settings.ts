import { CONFIG_DATA } from "../shared/config-data";
import { DAILY_DATA } from "../shared/daily-data";
import { getDailyDataSheet, getSharedSheet, isDevMode } from "./shared-sheet";

export interface Member {
	/** Google Chat user id */
	id: string;
	name: string;
	/** Email on the `two` account */
	email: string;
}

/** Email on the `one` account -> the same person on the `two` account */
export type Members = Record<string, Member>;

/** Content of the `config` tab. */
export interface Settings {
	/** `spaces/{id}` of the team space. PRODUCTION (DO NOT TEST) */
	rootSpace: string;
	/** `spaces/{id}` of the test space, used while the sheet flag is `DEV` */
	devSpace: string;
	/** `users/{id}` of the manager, addressed directly by the reaction check */
	managerUser: string;
	members: Members;
}

function text(value: unknown): string {
	return String(value ?? "").trim();
}

/** Active rows of `one email | chat id | name | two email | inactive`. */
export function parseMembers(rows: unknown[][]): Members {
	const members: Members = {};

	for (const row of rows) {
		const oneEmail = text(row[0]);
		const id = text(row[1]);
		// a ticked checkbox is `true`; a typed or pasted value is the text "TRUE"
		const inactive = text(row[CONFIG_DATA.MEMBER_INACTIVE_COL - 1]);
		if (!oneEmail || !id || inactive.toUpperCase() === "TRUE") continue;

		members[oneEmail] = { id, name: text(row[2]), email: text(row[3]) };
	}

	return members;
}

export function parseSettings(
	values: unknown[],
	memberRows: unknown[][],
): Settings {
	const spaceOfColumn = (column: number, label: string): string => {
		const id = text(values[column - 1]);
		if (!id) {
			throw new Error(`${label} is empty in the "${CONFIG_DATA.TAB}" tab.`);
		}
		return `spaces/${id}`;
	};

	return {
		rootSpace: spaceOfColumn(CONFIG_DATA.TWO_SPACE_COL, "Team space id"),
		devSpace: spaceOfColumn(CONFIG_DATA.DEV_SPACE_COL, "Test space id"),
		managerUser: text(values[CONFIG_DATA.MANAGER_COL - 1]),
		members: parseMembers(memberRows),
	};
}

let cached: Settings | undefined;

/** Settings of the `config` tab, read once per execution. */
export function getSettings(): Settings {
	if (!cached) {
		const sheet = getSharedSheet(CONFIG_DATA.TAB);
		cached = parseSettings(
			sheet.getRange(CONFIG_DATA.VALUES_RANGE).getValues()[0] ?? [],
			sheet.getRange(CONFIG_DATA.MEMBERS_RANGE).getValues(),
		);
	}

	return cached;
}

/** True while the mode flag of the shared sheet is `DEV`. */
export function readDevMode(): boolean {
	const flag = getDailyDataSheet().getRange(DAILY_DATA.MODE_CELL).getValue();
	Logger.log(`Mode flag: "${flag}"`);

	return isDevMode(flag);
}

/** Space that scheduled messages go to: the test space while the sheet flag is `DEV`. */
export function getTargetSpace(): string {
	const { rootSpace, devSpace } = getSettings();
	const space = readDevMode() ? devSpace : rootSpace;
	Logger.log(`Target space: ${space}`);

	return space;
}
