import { TIMEZONE } from "./daily-data";

export function deleteAllTriggers(): void {
	for (const trigger of ScriptApp.getProjectTriggers()) {
		ScriptApp.deleteTrigger(trigger);
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
