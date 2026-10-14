import type { ChatMessage, Icon, Widget } from "../../shared/chat-types";
import { formatDuration, type MemberWorklogs } from "./summary";

/** A member under this many hours is highlighted for review */
export const FULL_DAY_SECONDS = 8 * 60 * 60;

const GREEN = "#188038";
const ORANGE = "#e37400";
const GREY = "#5f6368";

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

function memberWidget(member: MemberWorklogs, jiraUrl: string): Widget {
	const full = member.seconds >= FULL_DAY_SECONDS;
	const total = `<font color="${full ? GREEN : ORANGE}"><b>${formatDuration(member.seconds)}</b></font>`;
	const issues = member.issues
		.map(
			(issue) =>
				`<a href="${jiraUrl}/browse/${issue.key}">${issue.key}</a> ${formatDuration(issue.seconds)} <font color="${GREY}">${escapeHtml(issue.summary)}</font>`,
		)
		.join("<br>");

	return {
		decoratedText: {
			topLabel: plural(member.issues.length, "issue"),
			text: `<b>${escapeHtml(member.name)}</b>  ${total}<br>${issues}`,
			wrapText: true,
			icon: icon(full ? "check_circle" : "schedule", full),
		},
	};
}

/** Worklog summary card of the last workday, one row per member, most time first. */
export function createWorklogCard(
	members: MemberWorklogs[],
	date: string,
	jiraUrl: string,
	searchUrl: string,
	dev = false,
): ChatMessage {
	const total = members.reduce((sum, m) => sum + m.seconds, 0);
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
							header: `${plural(members.length, "member")} · ${formatDuration(total)} logged`,
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
