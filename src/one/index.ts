import { getDayToCheck } from "../shared/date";
import { createDailyTrigger, deleteAllTriggers } from "../shared/triggers";
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
import {
	getLastWorkday,
	isWeekend,
	summarizeWorklogs,
} from "./worklogs/summary";

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

/** Runs daily: posts the Jira worklogs of the last workday, per member, to the team space. Skipped on weekends. */
export function worklogsDaily(): void {
	if (isWeekend()) {
		Logger.log("Weekend, no worklog report");
		return;
	}

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
			dev,
		}),
		dev ? CONFIG.WORKLOG_DEV_WEBHOOK_URL : CONFIG.WORKLOG_WEBHOOK_URL,
	);
}

/** Run this function MANUALLY after the triggers below change. */
export function setupTriggers(): void {
	deleteAllTriggers();
	createDailyTrigger("leaveStateDaily" satisfies Entrypoint, 13, 30);
	createDailyTrigger("worklogsDaily" satisfies Entrypoint, 8, 50);
}
