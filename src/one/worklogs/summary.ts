const DAY_MS = 24 * 60 * 60 * 1000;
/** Asia/Ho_Chi_Minh is UTC+7 all year (no daylight saving) */
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

/** One day in the script timezone, as `[start, end)` epoch milliseconds. */
export interface Workday {
	start: number;
	end: number;
	/** `DD/MM/YYYY`, shown on the card */
	label: string;
	/** `YYYY-MM-DD`, used in JQL */
	iso: string;
}

/** Fields of the local date of `ms` in the script timezone. */
function localParts(ms: number) {
	const d = new Date(ms + TZ_OFFSET_MS);
	return {
		year: d.getUTCFullYear(),
		month: d.getUTCMonth(),
		day: d.getUTCDate(),
		weekday: d.getUTCDay(),
	};
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of `ms` in the script timezone */
export function isoDate(ms: number): string {
	const { year, month, day } = localParts(ms);
	return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function isWeekend(now: number = Date.now()): boolean {
	const { weekday } = localParts(now);
	return weekday === 0 || weekday === 6;
}

/** Previous Monday-to-Friday day: Friday when run on Monday or during the weekend. */
export function getLastWorkday(now: number = Date.now()): Workday {
	const { year, month, day, weekday } = localParts(now);
	// days back from today: Mon -> Fri (3), Sun -> Fri (2), others -> yesterday
	const back = weekday === 1 ? 3 : weekday === 0 ? 2 : 1;
	const start = Date.UTC(year, month, day - back) - TZ_OFFSET_MS;
	const { year: y, month: m, day: d } = localParts(start);

	return {
		start,
		end: start + DAY_MS,
		label: `${pad(d)}/${pad(m + 1)}/${y}`,
		iso: isoDate(start),
	};
}

/** `2h`, `1h 30m`, `45m`, `0h` */
export function formatDuration(seconds: number): string {
	const minutes = Math.round(seconds / 60);
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (!m) return `${h}h`;
	return h ? `${h}h ${m}m` : `${m}m`;
}

/** Subset of a Jira worklog. */
export interface JiraWorklog {
	author?: { accountId?: string; displayName?: string };
	/** e.g. `2026-10-13T09:00:00.000+0700` */
	started: string;
	timeSpentSeconds: number;
}

export interface IssueWorklogs {
	key: string;
	summary: string;
	worklogs: JiraWorklog[];
}

export interface IssueTime {
	key: string;
	summary: string;
	seconds: number;
}

export interface MemberWorklogs {
	accountId: string;
	name: string;
	seconds: number;
	/** Most time first */
	issues: IssueTime[];
}

/** Jira's `+0700` offset is not ISO 8601 for `Date.parse`, which wants `+07:00`. */
export function parseJiraDate(value: string): number {
	return Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

/** Worklogs started within `day`, totalled per author and issue. Most time first. */
export function summarizeWorklogs(
	issues: IssueWorklogs[],
	day: Pick<Workday, "start" | "end">,
): MemberWorklogs[] {
	const byMember = new Map<string, MemberWorklogs>();

	for (const issue of issues) {
		for (const log of issue.worklogs) {
			const started = parseJiraDate(log.started);
			if (!(started >= day.start && started < day.end)) continue;

			const accountId = log.author?.accountId ?? "unknown";
			let member = byMember.get(accountId);
			if (!member) {
				member = {
					accountId,
					name: log.author?.displayName ?? "Unknown",
					seconds: 0,
					issues: [],
				};
				byMember.set(accountId, member);
			}

			member.seconds += log.timeSpentSeconds;
			let time = member.issues.find((i) => i.key === issue.key);
			if (!time) {
				time = { key: issue.key, summary: issue.summary, seconds: 0 };
				member.issues.push(time);
			}
			time.seconds += log.timeSpentSeconds;
		}
	}

	const members = [...byMember.values()];
	for (const member of members) {
		member.issues.sort((a, b) => b.seconds - a.seconds);
	}

	return members.sort(
		(a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name),
	);
}
