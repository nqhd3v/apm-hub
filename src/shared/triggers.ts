import { TIMEZONE } from "./daily-data";

export function deleteAllTriggers(): void {
	for (const trigger of ScriptApp.getProjectTriggers()) {
		ScriptApp.deleteTrigger(trigger);
	}
}

/** Deletes every trigger calling `handler`. */
export function deleteTriggersOf(handler: string): void {
	for (const trigger of ScriptApp.getProjectTriggers()) {
		if (trigger.getHandlerFunction() === handler) {
			ScriptApp.deleteTrigger(trigger);
		}
	}
}

/** Deletes the trigger with this unique id, if it still exists. */
export function deleteTrigger(uid: string): void {
	const trigger = ScriptApp.getProjectTriggers().find(
		(t) => t.getUniqueId() === uid,
	);
	if (trigger) ScriptApp.deleteTrigger(trigger);
}

/** One-time trigger calling `handler` at `at` (epoch milliseconds). */
export function createTriggerAt(handler: string, at: number): void {
	ScriptApp.newTrigger(handler).timeBased().at(new Date(at)).create();
}

/** Weekly triggers calling `handler` around `hour:minute` on Monday to Friday. */
export function createWeekdayTriggers(
	handler: string,
	hour: number,
	minute: number,
): void {
	const { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY } = ScriptApp.WeekDay;
	for (const day of [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]) {
		ScriptApp.newTrigger(handler)
			.timeBased()
			.onWeekDay(day)
			.atHour(hour)
			.nearMinute(minute)
			.inTimezone(TIMEZONE)
			.create();
	}
}

export function createDailyTrigger(
	handler: string,
	hour: number,
	minute: number,
): void {
	ScriptApp.newTrigger(handler)
		.timeBased()
		.everyDays(1)
		.atHour(hour)
		.nearMinute(minute)
		.inTimezone(TIMEZONE)
		.create();
}
