import { getDayToCheck } from "../shared/date";
import { createDailyTrigger, deleteAllTriggers } from "../shared/triggers";
import { CONFIG } from "./config";
import { pickLeaveRows, readPlanRows } from "./leave-state/plan";
import { updateSharedSheet } from "./leave-state/publish";

type Entrypoint = keyof typeof import("./index");

/** Runs daily: publishes tomorrow's day-off states to the shared sheet. */
export function leaveStateDaily(): void {
	const date = getDayToCheck();
	Logger.log(` ------ Start checking for ${date}`);

	const states = pickLeaveRows(readPlanRows(), date, CONFIG);
	if (states === null) {
		// Still publish the date with no rows, so the reader never sees stale data.
		Logger.log(` ------ Failed to get tomorrow! - ${date}`);
	} else {
		Logger.log(` ------ Check finished with result: ${JSON.stringify(states)}`);
	}

	updateSharedSheet(states ?? [], date);
}

/** Run this function MANUALLY after the triggers below change. */
export function setupTriggers(): void {
	deleteAllTriggers();
	createDailyTrigger("leaveStateDaily" satisfies Entrypoint, 13, 30);
}
