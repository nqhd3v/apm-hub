import { SESSION_MORNING, SESSION_PENDING } from "../../shared/daily-data";
import type { Button, ChatMessage, Icon, Section, Widget } from "../chat/types";
import type { MemberLeave } from "./states";

/** Name of the exported handler called by the session buttons. */
export const HALF_DAY_ACTION = "handleHalfDaySelection";

export type RejectReason =
	| "invalidSession"
	| "invalidDate"
	| "notRegistered"
	| "alreadyConfirmed";

const REJECT_REASONS: Record<RejectReason, string> = {
	invalidSession:
		"The session value is invalid. Please use the buttons provided.",
	invalidDate:
		"This leave notification has expired and is no longer accepting responses.",
	notRegistered: "You are not registered for a half-day leave on this date.",
	alreadyConfirmed: "You have already confirmed your leave session.",
};

function icon(name: string, fill: boolean): Icon {
	return { materialIcon: { name, fill } };
}

function plural(count: number): string {
	return count > 1 ? "s" : "";
}

function sessionButton(
	text: string,
	iconName: string,
	color: Button["color"],
	session: string,
	date: string,
): Button {
	return {
		text,
		icon: icon(iconName, true),
		color,
		onClick: {
			action: {
				function: HALF_DAY_ACTION,
				parameters: [
					{ key: "session", value: session },
					{ key: "date", value: date },
				],
			},
		},
	};
}

function leaveSection(
	header: string,
	people: Widget[],
	summary: string,
): Section {
	const collapsible = people.length > 5;
	return {
		header,
		collapsible,
		uncollapsibleWidgetsCount: collapsible ? 3 : undefined,
		widgets: [
			...people,
			{ divider: {} },
			{ decoratedText: { text: summary, icon: icon("group", true) } },
		],
	};
}

/** Leave reminder card, or null when nobody is off. */
export function createMessageLeaveCard(
	full: MemberLeave[],
	half: MemberLeave[],
	date: string,
	dev = false,
): ChatMessage | null {
	if (!full.length && !half.length) return null;

	const totalOff = full.length + half.length;
	const sections: Section[] = [];

	if (full.length) {
		sections.push(
			leaveSection(
				'<font color="#d93025">Full-day Off</font>',
				full.map((p) => ({
					decoratedText: {
						text: `<b>${p.name}</b>`,
						icon: icon("event_busy", true),
					},
				})),
				`<font color="#d93025"><b>${full.length}</b></font> member${plural(full.length)} off for the full day`,
			),
		);
	}

	if (half.length) {
		sections.push(
			leaveSection(
				'<font color="#e37400">Half-day Off</font>',
				half.map((p) => ({
					decoratedText: {
						text: `<b>${p.name}</b>`,
						bottomLabel:
							p.session === SESSION_PENDING
								? "Pending confirmation"
								: p.session === SESSION_MORNING
									? "Off in the morning"
									: "Off in the afternoon",
						icon:
							p.session === SESSION_PENDING
								? icon("pending", false)
								: icon("check_circle", true),
					},
				})),
				`<font color="#e37400"><b>${half.length}</b></font> member${plural(half.length)} off for half the day`,
			),
		);
	}

	const pending = half.filter((p) => p.session === SESSION_PENDING).length;
	if (pending) {
		sections.push({
			header: '<font color="#1a73e8">Action Required</font>',
			collapsible: false,
			widgets: [
				{
					decoratedText: {
						text: `<b>${pending}</b> member${plural(pending)} still need${pending === 1 ? "s" : ""} to confirm. If you are taking a half-day tomorrow, please select your leave session below.`,
						wrapText: true,
						icon: icon("info", true),
					},
				},
				{
					buttonList: {
						buttons: [
							sessionButton(
								"Morning",
								"light_mode",
								{ red: 0.98, green: 0.64, blue: 0.0, alpha: 1 },
								"1",
								date,
							),
							sessionButton(
								"Afternoon",
								"dark_mode",
								{ red: 0.1, green: 0.45, blue: 0.91, alpha: 1 },
								"2",
								date,
							),
						],
					},
				},
			],
		});
	}

	return {
		cardsV2: [
			{
				cardId: "leaveReport",
				card: {
					header: {
						title: `${dev ? "[DEV] " : ""}📢 Tomorrow's leave reminder`,
						subtitle: `${date} — ${totalOff} member${plural(totalOff)} off`,
					},
					sections,
				},
			},
		],
	};
}

/** Private confirmation shown to `userName` in the card's thread. */
export function createSuccessMessage(
	threadName: string,
	userName: string,
	session: string,
	date: string,
): ChatMessage {
	const sessionLabel = session === "1" ? "Morning" : "Afternoon";
	return {
		text: "",
		cardsV2: [
			{
				cardId: "confirmSessionRequest",
				card: {
					sections: [
						{
							widgets: [
								{
									decoratedText: {
										text: "<b>Leave session confirmed</b>",
										bottomLabel: `${sessionLabel} off on ${date}`,
										icon: icon("check_circle", true),
									},
								},
							],
						},
					],
				},
			},
		],
		thread: { name: threadName },
		privateMessageViewer: { name: userName },
	};
}

export function createRejectMessage(
	threadName: string,
	userName: string,
	reason: RejectReason,
): ChatMessage {
	return {
		cardsV2: [
			{
				cardId: "rejectLeaveRequest",
				card: {
					sections: [
						{
							widgets: [
								{
									decoratedText: {
										text: "<b>Action rejected</b>",
										bottomLabel: REJECT_REASONS[reason],
										wrapText: true,
										icon: icon("error", true),
									},
								},
							],
						},
					],
				},
			},
		],
		thread: { name: threadName },
		privateMessageViewer: { name: userName },
	};
}
