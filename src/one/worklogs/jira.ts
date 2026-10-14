import { CONFIG } from "../config";
import type { IssueWorklogs, JiraWorklog, Workday } from "./summary";
import { findTeamField, type JiraField, teamOf } from "./team";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Worklog requests sent at once, to stay under Jira's rate limit */
const PARALLEL = 10;

/** Jira site without trailing slash */
export function jiraBaseUrl(): string {
	return CONFIG.JIRA_BASE_URL.replace(/\/+$/, "");
}

function authHeader(): string {
	return `Basic ${Utilities.base64Encode(`${CONFIG.JIRA_EMAIL}:${CONFIG.JIRA_API_TOKEN}`)}`;
}

function request(
	path: string,
	auth: string,
	payload?: object,
): GoogleAppsScript.URL_Fetch.URLFetchRequest {
	return {
		url: `${jiraBaseUrl()}${path}`,
		method: payload ? "post" : "get",
		contentType: "application/json",
		headers: { Authorization: auth, Accept: "application/json" },
		payload: payload ? JSON.stringify(payload) : undefined,
		muteHttpExceptions: true,
	};
}

function parse<T>(
	response: GoogleAppsScript.URL_Fetch.HTTPResponse,
	url: string,
): T {
	const code = response.getResponseCode();
	const body = response.getContentText();
	if (code < 200 || code >= 300) {
		throw new Error(`Jira ${code} on ${url}: ${body.slice(0, 500)}`);
	}

	return JSON.parse(body) as T;
}

/**
 * Issue search link of the project's worklogs on `day`, for people to check
 * the report in Jira. Limited to `teamId` when given.
 */
export function worklogSearchUrl(
	day: Pick<Workday, "iso">,
	teamId?: string,
): string {
	const team = teamId ? ` AND "Team[Team]" = "${teamId}"` : "";
	const jql = `project = "${CONFIG.JIRA_PROJECT_KEY}" AND worklogDate = "${day.iso}"${team}`;
	return `${jiraBaseUrl()}/issues/?jql=${encodeURIComponent(jql)}`;
}

interface SearchIssue {
	key: string;
	fields: Record<string, unknown> & { summary?: string };
}

interface SearchPage {
	issues: SearchIssue[];
	nextPageToken?: string;
}

function searchIssues(
	jql: string,
	fields: string[],
	auth: string,
): SearchIssue[] {
	const issues: SearchIssue[] = [];
	let nextPageToken: string | undefined;

	do {
		const req = request("/rest/api/3/search/jql", auth, {
			jql,
			fields,
			maxResults: 100,
			nextPageToken,
		});
		const page = parse<SearchPage>(UrlFetchApp.fetch(req.url, req), req.url);
		issues.push(...page.issues);
		nextPageToken = page.nextPageToken;
	} while (nextPageToken);

	return issues;
}

/** Id of the Team field of the site (`customfield_...`). */
function getTeamFieldId(auth: string): string {
	const req = request("/rest/api/3/field", auth);
	const field = findTeamField(
		parse<JiraField[]>(UrlFetchApp.fetch(req.url, req), req.url),
	);
	if (!field) throw new Error("Jira has no Team field.");

	return field.id;
}

export interface FetchedWorklogs {
	issues: IssueWorklogs[];
	/** Id of the team named `team`, when one of the issues belongs to it */
	teamId?: string;
}

/**
 * Issues of the project with their worklogs started around `day`.
 * When `team` is set, only issues whose Team is named exactly `team`.
 */
export function fetchWorklogs(day: Workday, team = ""): FetchedWorklogs {
	const auth = authHeader();
	const teamField = team ? getTeamFieldId(auth) : "";
	// `worklogDate` uses the timezone of the Jira account, so widen by a day
	// on each side; `summarizeWorklogs` keeps the exact day.
	const jql = `project = "${CONFIG.JIRA_PROJECT_KEY}" AND worklogDate >= "${isoShift(day.iso, -1)}" AND worklogDate <= "${isoShift(day.iso, 1)}"`;
	const found = searchIssues(
		jql,
		teamField ? ["summary", teamField] : ["summary"],
		auth,
	);
	Logger.log(`Jira: ${found.length} issue(s) for ${jql}`);

	let teamId: string | undefined;
	const issues = found
		.filter((issue) => {
			if (!team) return true;
			const issueTeam = teamOf(issue.fields[teamField]);
			if (issueTeam?.name !== team) return false;
			teamId = issueTeam.id;
			return true;
		})
		.map((issue) => ({ key: issue.key, summary: issue.fields.summary ?? "" }));
	if (team) {
		const names = new Set(found.map((i) => teamOf(i.fields[teamField])?.name));
		Logger.log(
			`Team "${team}": ${issues.length} issue(s). Teams seen: ${JSON.stringify([...names])}`,
		);
	}

	const result: IssueWorklogs[] = [];
	for (let i = 0; i < issues.length; i += PARALLEL) {
		const chunk = issues.slice(i, i + PARALLEL);
		const requests = chunk.map((issue) =>
			request(
				`/rest/api/3/issue/${issue.key}/worklog?startedAfter=${day.start - DAY_MS}&startedBefore=${day.end + DAY_MS}&maxResults=5000`,
				auth,
			),
		);
		const responses = UrlFetchApp.fetchAll(requests);
		chunk.forEach((issue, index) => {
			const response = responses[index];
			const req = requests[index];
			if (!response || !req) return;
			const { worklogs } = parse<{ worklogs: JiraWorklog[] }>(
				response,
				req.url,
			);
			result.push({ ...issue, worklogs });
		});
	}

	return { issues: result, teamId };
}

/** `YYYY-MM-DD` moved by `days` */
function isoShift(iso: string, days: number): string {
	return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
