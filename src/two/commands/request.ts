import type { ChatUser, CommandEvent } from "../chat/types";

/** Command ids, as registered for the Chat app in the Google Cloud console. */
export const COMMAND = {
	/** `/add @member oneAccount@sample.com` */
	ADD: 1,
	/** `/remove @member` */
	REMOVE: 2,
	/** `/status` */
	STATUS: 3,
} as const;

export interface Mention {
	/** Google Chat user id, without the `users/` prefix */
	id: string;
	name: string;
}

export interface CommandRequest {
	commandId: number;
	user: ChatUser;
	/** Thread the command was sent in, empty when unknown */
	thread: string;
	/** First person mentioned in the command */
	mention: Mention | null;
	/** First email typed in the command, lowercased */
	email: string | null;
}

const EMAIL = /[^\s<>()|,;:]+@[^\s<>()|,;:]+\.[a-z]{2,}/i;

/** Command carried by a Chat event, or null when the event is not a command. */
export function parseCommand(event: CommandEvent): CommandRequest | null {
	const { appCommandPayload, messagePayload, user } = event.chat;
	// Slash commands arrive as an app command or as a message, depending on how the Chat app is configured.
	const message = appCommandPayload?.message ?? messagePayload?.message;
	const rawId =
		appCommandPayload?.appCommandMetadata?.appCommandId ??
		message?.slashCommand?.commandId;
	const commandId = Number(rawId);
	if (rawId === undefined || !Number.isInteger(commandId)) return null;

	const mentioned = message?.annotations
		?.map((annotation) => annotation.userMention?.user)
		.find((person) => person?.name && person.type !== "BOT");
	const id = mentioned?.name.split("/")[1];
	const text = message?.argumentText ?? message?.text ?? "";

	return {
		commandId,
		user,
		thread: message?.thread?.name ?? "",
		mention: mentioned && id ? { id, name: mentioned.displayName ?? "" } : null,
		email: EMAIL.exec(text)?.[0].toLowerCase() ?? null,
	};
}
