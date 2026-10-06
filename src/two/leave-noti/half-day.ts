import { SESSION_PENDING } from "../../shared/daily-data";
import { replyInThread, spaceOf } from "../chat/send";
import type { ButtonClickEvent, ChatDataActionResponse } from "../chat/types";
import { getSettings } from "../settings";
import {
	createMessageLeaveCard,
	createRejectMessage,
	createSuccessMessage,
	type RejectReason,
} from "./cards";
import {
	getLeavingStatesFromSharedSheet,
	type MemberLeave,
	ownsLeave,
	updateSessionByEmail,
} from "./states";

export interface SessionRequest {
	/** `users/{id}` of the member who clicked */
	userName?: string;
	email?: string;
	session?: string;
	date?: string;
}

/** Reason to reject a session selection, or null when it is valid. */
export function checkUserRequest(
	payload: SessionRequest,
	dateToCompare: string,
	halfStates: MemberLeave[],
): RejectReason | null {
	if (payload.session !== "1" && payload.session !== "2") {
		return "invalidSession";
	}
	if (!payload.date || payload.date !== dateToCompare) {
		return "invalidDate";
	}
	const currentState = halfStates.find((s) =>
		ownsLeave(s, { name: payload.userName, email: payload.email }),
	);
	if (!currentState) {
		return "notRegistered";
	}
	if (currentState.session !== SESSION_PENDING) {
		return "alreadyConfirmed";
	}

	return null;
}

/** Click on the Morning / Afternoon button of the leave card. */
export function handleHalfDaySelection(
	event: ButtonClickEvent,
): ChatDataActionResponse | undefined {
	const { halfDay, date } = getLeavingStatesFromSharedSheet();

	const { session, date: cardDate } = event.commonEventObject.parameters ?? {};
	const user = event.chat.user;
	const thread = event.chat.buttonClickedPayload.message.thread.name;

	Logger.log(`Current date: ${date}`);
	Logger.log(
		`Receive action: ${JSON.stringify({ session, cardDate, user, clickCreateThread: thread })}`,
	);

	const requestError = checkUserRequest(
		{ userName: user.name, email: user.email, session, date: cardDate },
		date,
		halfDay,
	);

	if (requestError || !session) {
		// in case invalid payload, or not a user register for half-day
		// -> rejected
		Logger.log(
			`Rejected -> Reply with new message in thread ("${thread}"), reason: ${requestError}`,
		);
		return {
			hostAppDataAction: {
				chatDataAction: {
					createMessageAction: {
						message: createRejectMessage(
							thread,
							user.name,
							requestError ?? "invalidSession",
						),
					},
				},
			},
		};
	}

	// update session in temporary sheet
	const leave = halfDay.find((s) => ownsLeave(s, user));
	Logger.log(`Update session ("${session}") of "${leave?.oneEmail}"`);
	updateSessionByEmail(leave?.oneEmail ?? user.email, Number(session));
	// reply in current thread
	replyInThread(createSuccessMessage(thread, user.name, session, date));
	// update new state
	const updated = getLeavingStatesFromSharedSheet();
	const { rootSpace } = getSettings();
	const newMessage = createMessageLeaveCard(
		updated.fullDay,
		updated.halfDay,
		date,
		spaceOf(thread, rootSpace) !== rootSpace,
	);
	if (!newMessage) return undefined;

	return {
		hostAppDataAction: {
			chatDataAction: { updateMessageAction: { message: newMessage } },
		},
	};
}
