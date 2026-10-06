import { getSettings } from "../settings";
import { getToken } from "./auth";
import type { ChatMessage, SentMessage } from "./types";

/** `spaces/X` of a message or thread name like `spaces/X/threads/Y`, or `fallback`. */
export function spaceOf(resourceName: string, fallback: string): string {
	const [collection, id] = resourceName.split("/");
	return collection === "spaces" && id ? `spaces/${id}` : fallback;
}

export function sendMessageToSpace(
	message: ChatMessage,
	space: string,
): SentMessage | null {
	const tk = getToken();
	if (!tk) return null;

	try {
		const msg = Chat.Spaces.Messages.create(
			message,
			space,
			{},
			{ Authorization: tk },
		);

		Logger.log("Sent message to space");
		return msg;
	} catch (error) {
		Logger.log(JSON.stringify({ message, space }));
		Logger.log(`Send failed with error: ${error}`);
		return null;
	}
}

/** Sends `message` as a reply in `message.thread`, in the space that thread belongs to. */
export function replyInThread(message: ChatMessage): void {
	const tk = getToken();
	if (!tk) return;
	const space = spaceOf(message.thread?.name ?? "", getSettings().rootSpace);

	try {
		Chat.Spaces.Messages.create(
			message,
			space,
			{ messageReplyOption: "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD" },
			{ Authorization: tk },
		);

		Logger.log(`Replied to thread ("${message.thread?.name}")`);
	} catch (error) {
		Logger.log(`Send failed with error: ${error}`);
	}
}
