import { getDayToCheck } from "../shared/date";
import {
	createDailyTrigger,
	createTriggerAt,
	createWeekdayTriggers,
	deleteAllTriggers,
	deleteTrigger,
	deleteTriggersOf,
} from "../shared/triggers";
import { CONFIG } from "./config";
import { pickLeaveRows, readPlanRows } from "./leave-state/plan";
import { updateSharedSheet } from "./leave-state/publish";
import { createWorklogCard } from "./worklogs/cards";
import {
	fetchWorkingDaySeconds,
	fetchWorklogs,
	jiraBaseUrl,
	worklogSearchUrl,
} from "./worklogs/jira";
import { sendToWebhook } from "./worklogs/send";
import { readDevMode, readWorklogTeam } from "./worklogs/settings";
import { getLastWorkday, summarizeWorklogs, todayAt } from "./worklogs/summary";

type Entrypoint = keyof typeof import("./index");

/** Exact time of the worklog report, Asia/Ho_Chi_Minh */
const WORKLOG_REPORT = { hour: 9, minute: 5 } as const;

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

/**
 * Runs Monday to Friday around 07:00: creates today's one-time trigger of
 * `worklogsDaily` at exactly `WORKLOG_REPORT` (09:05), which a recurring
 * trigger cannot do (it fires within ±15 min).
 */
export function scheduleWorklogs(): void {
	// leftovers of a day the report did not run
	deleteTriggersOf("worklogsDaily" satisfies Entrypoint);
	const at = todayAt(WORKLOG_REPORT.hour, WORKLOG_REPORT.minute);
	if (at <= Date.now()) {
		Logger.log("Report time has passed, no worklog report scheduled today");
		return;
	}

	createTriggerAt("worklogsDaily" satisfies Entrypoint, at);
	Logger.log(`Worklog report scheduled at ${new Date(at).toISOString()}`);
}

/**
 * Posts the Jira worklogs of the last workday, per member, to the team space.
 * Called by the one-time trigger of `scheduleWorklogs`, which it deletes, or
 * by hand from the editor.
 */
export function worklogsDaily(e?: GoogleAppsScript.Events.TimeDriven): void {
	// a one-time trigger stays in the project after it fired
	if (e?.triggerUid) deleteTrigger(e.triggerUid);

	const day = getLastWorkday();
	const team = readWorklogTeam();
	const { issues, teamId } = fetchWorklogs(day, team);
	const members = summarizeWorklogs(issues, day);
	Logger.log(`Worklogs of ${day.iso}: ${JSON.stringify(members)}`);

	const dev = readDevMode();
	sendToWebhook(
		createWorklogCard(members, {
			date: day.label,
			jiraUrl: jiraBaseUrl(),
			searchUrl: worklogSearchUrl(day, teamId),
			daySeconds: fetchWorkingDaySeconds(),
			team,
		}),
		dev ? CONFIG.WORKLOG_DEV_WEBHOOK_URL : CONFIG.WORKLOG_WEBHOOK_URL,
	);
}

/** Run this function MANUALLY after the triggers below change. */
export function setupTriggers(): void {
	deleteAllTriggers();
	createDailyTrigger("leaveStateDaily" satisfies Entrypoint, 13, 30);
	createWeekdayTriggers("scheduleWorklogs" satisfies Entrypoint, 7, 0);
}
