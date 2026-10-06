import { createDailyTrigger, deleteAllTriggers } from "../shared/triggers";
import { sendMessageToSpace } from "./chat/send";
import type { ChatDataActionResponse, CommandEvent } from "./chat/types";
import { handleCommand } from "./commands/handle";
import { createMessageLeaveCard } from "./leave-noti/cards";
import { updateLastMessageConfig } from "./leave-noti/last-message";
import { getLeavingStatesFromSharedSheet } from "./leave-noti/states";
import { getSettings, getTargetSpace } from "./settings";

export { handleHalfDaySelection } from "./leave-noti/half-day";
export { checkReactions } from "./leave-noti/reactions";

type Entrypoint = keyof typeof import("./index");

/** Runs daily: posts tomorrow's leave reminder card to the team space. */
export function leaveNotiDaily(): void {
	const { fullDay, halfDay, date } = getLeavingStatesFromSharedSheet();

	const space = getTargetSpace();
	const message = createMessageLeaveCard(
		fullDay,
		halfDay,
		date,
		space !== getSettings().rootSpace,
	);
	if (!message) {
		Logger.log(`Nobody is off on ${date}, nothing to send`);
		return;
	}

	const msg = sendMessageToSpace(message, space);
	if (!msg) return;

	updateLastMessageConfig(msg.name, msg.thread?.name ?? "");
}

/** Message sent to the Chat app. Only slash commands are answered. */
export function onMessage(e: CommandEvent): ChatDataActionResponse | undefined {
	Logger.log(`message:${JSON.stringify(e)}`);
	return handleCommand(e);
}

/** `/add`, `/remove` and `/status`, see `commands/`. */
export function onAppCommand(
	e: CommandEvent,
): ChatDataActionResponse | undefined {
	Logger.log(`command: ${JSON.stringify(e)}`);
	return handleCommand(e);
}

/** Run this function MANUALLY after the triggers below change. */
export function setupTriggers(): void {
	deleteAllTriggers();
	createDailyTrigger("leaveNotiDaily" satisfies Entrypoint, 16, 30);
	ScriptApp.newTrigger("checkReactions" satisfies Entrypoint)
		.timeBased()
		.everyMinutes(15)
		.create();
}
