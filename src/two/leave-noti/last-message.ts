import { DAILY_DATA } from "../../shared/daily-data";
import { getDailyDataSheet } from "../shared-sheet";

export interface LastMessage {
	message: string;
	thread: string;
	/** Users already replied to by the reaction check */
	seen: string[];
}

/** Remembers the last leave card so the reaction check can find it. */
export function updateLastMessageConfig(message: string, thread: string): void {
	getDailyDataSheet()
		.getRange(DAILY_DATA.MESSAGE_RANGE)
		.setValues([[message], [thread], [""]]);
}

export function getLastMessageConfig(): LastMessage {
	const values = getDailyDataSheet()
		.getRange(DAILY_DATA.MESSAGE_RANGE)
		.getValues();

	return {
		message: String(values[0]?.[0] ?? ""),
		thread: String(values[1]?.[0] ?? ""),
		seen: String(values[2]?.[0] ?? "")
			.split(";")
			.filter(Boolean),
	};
}

export function setLastMessageReactSeen(seen: string[]): void {
	getDailyDataSheet()
		.getRange(DAILY_DATA.MESSAGE_SEEN_ROW, DAILY_DATA.MESSAGE_COL)
		.setValue(seen.join(";"));
}
