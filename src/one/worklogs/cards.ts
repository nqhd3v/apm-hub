import type { ChatMessage, Icon, Widget } from "../../shared/chat-types";
import {
	DEFAULT_DAY_SECONDS,
	formatDuration,
	type MemberWorklogs,
} from "./summary";

const GREEN = "#188038";
const ORANGE = "#e37400";
/** Overtime on the weekend */
const BLUE = "#1a73e8";
/**
 * Share of the working day under which a member gets the warning. Below a
 * full day on purpose: early in a sprint people work more than they log.
 */
export const WARNING_RATIO = 2 / 3;

function icon(name: string, fill: boolean): Icon {
	return { materialIcon: { name, fill } };
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function plural(count: number, word: string): string {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** `Name 13h 30m (+2h in Sat)`, then the keys of the issues worked on, most time first. */
function memberWidget(
	member: MemberWorklogs,
	jiraUrl: string,
	daySeconds: number,
): Widget {
	const full = member.seconds >= daySeconds * WARNING_RATIO;
	const total = `<font color="${full ? GREEN : ORANGE}"><b>${formatDuration(member.seconds)}</b></font>`;
	const extra = member.extra?.length
		? ` (${member.extra.map((t) => `<font color="${BLUE}"><b>+${formatDuration(t.seconds)}</b></font> in ${t.name}`).join(", ")})`
		: "";
	const issues = member.issues
		.map((i) => `<a href="${jiraUrl}/browse/${i.key}">${i.key}</a>`)
		.join(" · ");

	return {
		decoratedText: {
			text: `<b>${escapeHtml(member.name)}</b> ${total}${extra}<br>${issues}`,
			wrapText: true,
			icon: icon(full ? "check_circle" : "schedule", full),
		},
	};
}

export interface WorklogCardOptions {
	/** `DD/MM/YYYY` */
	date: string;
	/** Jira site, for issue links */
	jiraUrl: string;
	/** Jira search of the same worklogs, opened by the button */
	searchUrl: string;
	/** Working day of Jira: a member under `WARNING_RATIO` of it gets the warning */
	daySeconds?: number;
	/** Team the report is limited to, "" for every team */
	team?: string;
}

/** Worklog summary card of the last workday, one row per member, most time first. */
export function createWorklogCard(
	members: MemberWorklogs[],
	{
		date,
		jiraUrl,
		searchUrl,
		daySeconds = DEFAULT_DAY_SECONDS,
		team = "",
	}: WorklogCardOptions,
): ChatMessage {
	const total = members.reduce((sum, m) => sum + m.seconds, 0);
	const scope = team ? `${escapeHtml(team)} · ` : "";
	const widgets: Widget[] = members.length
		? members.map((m) => memberWidget(m, jiraUrl, daySeconds))
		: [
				{
					decoratedText: {
						text: "No worklog was logged on this day.",
						icon: icon("info", true),
					},
				},
			];

	return {
		cardsV2: [
			{
				cardId: "worklogReport",
				card: {
					header: {
						title: "Worklogs in last workday",
						subtitle: date,
					},
					sections: [
						{
							header: `${scope}${plural(members.length, "member")} · ${formatDuration(total)} logged`,
							widgets: [
								...widgets,
								{ divider: {} },
								{
									buttonList: {
										buttons: [
											{
												text: "Open in Jira",
												icon: icon("open_in_new", false),
												onClick: { openLink: { url: searchUrl } },
											},
										],
									},
								},
							],
						},
					],
				},
			},
		],
	};
}

/** Report to the dev space of what went wrong in the worklog report of `date`. */
export function createProblemsMessage(
	date: string,
	problems: string[],
	report = "Worklog report",
): ChatMessage {
	return {
		text: `*${report} of ${date}: ${plural(problems.length, "problem")}*\n${problems.map((p) => `• ${p}`).join("\n")}`,
	};
}
