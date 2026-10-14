import { CONFIG } from "../config";
import type { IssueWorklogs, JiraWorklog, Workday } from "./summary";

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

/** JQL of the project's issues with a worklog on `day`. */
function worklogJql(day: Pick<Workday, "iso">): string {
	return `project = "${CONFIG.JIRA_PROJECT_KEY}" AND worklogDate = "${day.iso}"`;
}

/** Issue search link, for people to check the report in Jira. */
export function worklogSearchUrl(day: Pick<Workday, "iso">): string {
	return `${jiraBaseUrl()}/issues/?jql=${encodeURIComponent(worklogJql(day))}`;
}

interface SearchPage {
	issues: { key: string; fields: { summary?: string } }[];
	nextPageToken?: string;
}

function searchIssues(
	jql: string,
	auth: string,
): { key: string; summary: string }[] {
	const issues: { key: string; summary: string }[] = [];
	let nextPageToken: string | undefined;

	do {
		const req = request("/rest/api/3/search/jql", auth, {
			jql,
			fields: ["summary"],
			maxResults: 100,
			nextPageToken,
		});
		const page = parse<SearchPage>(UrlFetchApp.fetch(req.url, req), req.url);
		for (const issue of page.issues) {
			issues.push({ key: issue.key, summary: issue.fields.summary ?? "" });
		}
		nextPageToken = page.nextPageToken;
	} while (nextPageToken);

	return issues;
}

/** Issues of the project with their worklogs started around `day`. */
export function fetchWorklogs(day: Workday): IssueWorklogs[] {
	const auth = authHeader();
	// `worklogDate` uses the timezone of the Jira account, so widen by a day
	// on each side; `summarizeWorklogs` keeps the exact day.
	const jql = `project = "${CONFIG.JIRA_PROJECT_KEY}" AND worklogDate >= "${isoShift(day.iso, -1)}" AND worklogDate <= "${isoShift(day.iso, 1)}"`;
	const issues = searchIssues(jql, auth);
	Logger.log(`Jira: ${issues.length} issue(s) for ${jql}`);

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

	return result;
}

/** `YYYY-MM-DD` moved by `days` */
function isoShift(iso: string, days: number): string {
	return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
