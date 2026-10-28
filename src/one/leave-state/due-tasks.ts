import { CONFIG_DATA, ROLE_DEV } from "../../shared/config-data";
import { CONFIG } from "../config";
import {
	authHeader,
	parse,
	request,
	type SearchIssue,
	searchIssues,
} from "../worklogs/jira";

/** Subset of a user of `GET /rest/api/3/user/search`. */
export interface JiraUser {
	accountId: string;
	emailAddress?: string;
	accountType?: string;
}

function text(value: unknown): string {
	return String(value ?? "").trim();
}

/** Lowercased `one` emails of the member rows whose role is `DEV`, inactive rows included. */
export function devEmails(memberRows: unknown[][]): Set<string> {
	const emails = new Set<string>();
	for (const row of memberRows) {
		const email = text(row[0]).toLowerCase();
		const role = text(row[CONFIG_DATA.MEMBER_ROLE_COL - 1]).toUpperCase();
		if (email && role === ROLE_DEV) emails.add(email);
	}

	return emails;
}

/**
 * Account of `email` among the results of a user search: the one with that
 * email, else the only person found (Jira hides emails by privacy setting).
 */
export function pickJiraUser(
	users: JiraUser[],
	email: string,
): JiraUser | undefined {
	const people = users.filter(
		(u) => !u.accountType || u.accountType === "atlassian",
	);
	const exact = people.find(
		(u) => u.emailAddress?.toLowerCase() === email.toLowerCase(),
	);
	if (exact) return exact;

	return people.length === 1 ? people[0] : undefined;
}

/** JQL of the unfinished sub-tasks of the project assigned to `accountIds`, due on `isoDay`. */
export function dueTasksJql(isoDay: string, accountIds: string[]): string {
	const assignees = accountIds.map((id) => `"${id}"`).join(", ");
	return `project = "${CONFIG.JIRA_PROJECT_KEY}" AND issuetype in subTaskIssueTypes() AND duedate = "${isoDay}" AND statusCategory != Done AND assignee in (${assignees}) ORDER BY key`;
}

/** Keys of `found` grouped by the account id of their assignee. */
export function groupByAssignee(found: SearchIssue[]): Map<string, string[]> {
	const groups = new Map<string, string[]>();
	for (const issue of found) {
		const assignee = issue.fields.assignee as { accountId?: string } | null;
		if (!assignee?.accountId) continue;
		const tasks = groups.get(assignee.accountId) ?? [];
		tasks.push(issue.key);
		groups.set(assignee.accountId, tasks);
	}

	return groups;
}

export interface DueTasksResult {
	/** Lowercased email -> keys of its unfinished sub-tasks due on the day */
	tasks: Map<string, string[]>;
	problems: string[];
}

/**
 * Unfinished sub-tasks (sub-bugs included) due on `isoDay` of each of
 * `emails`, people who are off that day and whose role is `DEV`.
 */
export function fetchDueTasks(
	emails: string[],
	isoDay: string,
): DueTasksResult {
	const result: DueTasksResult = { tasks: new Map(), problems: [] };
	if (!emails.length) return result;

	const auth = authHeader();
	const emailOf = new Map<string, string>();
	for (const email of emails) {
		const req = request(
			`/rest/api/3/user/search?query=${encodeURIComponent(email)}`,
			auth,
		);
		const user = pickJiraUser(
			parse<JiraUser[]>(UrlFetchApp.fetch(req.url, req), req.url),
			email,
		);
		if (user) emailOf.set(user.accountId, email);
		else result.problems.push(`No Jira account found for ${email}`);
	}
	if (!emailOf.size) return result;

	const jql = dueTasksJql(isoDay, [...emailOf.keys()]);
	const found = searchIssues(jql, ["assignee"], auth);
	Logger.log(`Jira: ${found.length} due task(s) for ${jql}`);
	for (const [accountId, tasks] of groupByAssignee(found)) {
		const email = emailOf.get(accountId);
		if (email) result.tasks.set(email, tasks);
	}

	return result;
}
