import type { ChatMessage, Icon, Widget } from "../../shared/chat-types";
import { formatDuration, type MemberWorklogs } from "./summary";

/** A member under this many hours is highlighted for review */
export const FULL_DAY_SECONDS = 8 * 60 * 60;

const GREEN = "#188038";
const ORANGE = "#e37400";

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

/** `Name 13h 30m`, then the keys of the issues worked on, most time first. */
function memberWidget(member: MemberWorklogs, jiraUrl: string): Widget {
	const full = member.seconds >= FULL_DAY_SECONDS;
	const total = `<font color="${full ? GREEN : ORANGE}"><b>${formatDuration(member.seconds)}</b></font>`;
	const issues = member.issues
		.map((i) => `<a href="${jiraUrl}/browse/${i.key}">${i.key}</a>`)
		.join(" · ");

	return {
		decoratedText: {
			text: `<b>${escapeHtml(member.name)}</b> ${total}<br>${issues}`,
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
	/** Team the report is limited to, "" for every team */
	team?: string;
	dev?: boolean;
}

/** Worklog summary card of the last workday, one row per member, most time first. */
export function createWorklogCard(
	members: MemberWorklogs[],
	{ date, jiraUrl, searchUrl, team = "", dev = false }: WorklogCardOptions,
): ChatMessage {
	const total = members.reduce((sum, m) => sum + m.seconds, 0);
	const scope = team ? `${escapeHtml(team)} · ` : "";
	const widgets: Widget[] = members.length
		? members.map((m) => memberWidget(m, jiraUrl))
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
						title: `${dev ? "[DEV] " : ""}Worklogs in last workday`,
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
