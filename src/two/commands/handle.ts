import type {
	ChatDataActionResponse,
	ChatMessage,
	CommandEvent,
} from "../chat/types";
import { getLeavingStatesFromSharedSheet } from "../leave-noti/states";
import { getSettings, readDevMode } from "../settings";
import {
	addMember,
	isMember,
	type MemberMatch,
	removeMember,
	removeMemberByQuery,
} from "./members";
import { COMMAND, type CommandRequest, parseCommand } from "./request";
import { formatStatus } from "./status";

interface Reply {
	text: string;
	/** Shown to everyone in the space instead of the sender only */
	visibleToAll?: boolean;
}

/** Shortest text `/remove` searches for, so that a stray letter cannot match half the list */
const MIN_QUERY_LENGTH = 3;

function listMatches(matches: MemberMatch[]): string {
	return matches
		.map((match) => `• ${match.name} (${match.oneEmail})`)
		.join("\n");
}

/** `/remove some-text`, for a person who left the space and cannot be mentioned any more. */
function removeByQuery(query: string, sender: string): Reply {
	if (query.length < MIN_QUERY_LENGTH) {
		return {
			text: `Usage: \`/remove @member\`, or \`/remove part-of-name-or-email\` (at least ${MIN_QUERY_LENGTH} characters) when the person cannot be mentioned.`,
		};
	}

	const result = removeMemberByQuery(query);
	switch (result.status) {
		case "removed":
			return {
				text: `${sender} set *${result.member.name}* as inactive.`,
				visibleToAll: true,
			};
		case "ambiguous":
			return {
				text: `${result.matches.length} members match "${query}", nothing was changed. Type more of the name or email:\n${listMatches(result.matches)}`,
			};
		case "inactive":
			return {
				text: `Already inactive:\n${listMatches(result.matches)}`,
			};
		default:
			return { text: `No member matches "${query}".` };
	}
}

function run(request: CommandRequest): Reply {
	const { members } = getSettings();
	// the Chat app can be installed by anyone in the organisation
	if (!isMember(members, request.user)) {
		return {
			text: "Only active members of the member list can use this command.",
		};
	}

	const { mention, email } = request;
	const sender = `<${request.user.name}>`;

	switch (request.commandId) {
		case COMMAND.ADD: {
			if (!mention || !email) {
				return { text: "Usage: `/add @member one-account@sample.com`" };
			}
			const updated = addMember({ ...mention, oneEmail: email });
			return {
				text: `${sender} ${updated ? "updated" : "added"} <users/${mention.id}> as ${email}.`,
				visibleToAll: true,
			};
		}
		case COMMAND.REMOVE: {
			if (mention) {
				if (!removeMember(mention.id)) {
					return { text: `<users/${mention.id}> is not in the member list.` };
				}
				return {
					text: `${sender} set <users/${mention.id}> as inactive.`,
					visibleToAll: true,
				};
			}
			return removeByQuery(request.query, sender);
		}
		case COMMAND.STATUS: {
			const { date, ...states } = getLeavingStatesFromSharedSheet();
			return {
				text: formatStatus(
					readDevMode(),
					date,
					states,
					Object.keys(members).length,
				),
			};
		}
		default:
			return { text: `Unknown command (${request.commandId}).` };
	}
}

/** Message answering a command: private to the sender unless the reply is for everyone. */
export function createReplyMessage(
	reply: Reply,
	request: Pick<CommandRequest, "user" | "thread">,
): ChatMessage {
	const message: ChatMessage = { text: reply.text };
	if (!reply.visibleToAll) {
		message.privateMessageViewer = { name: request.user.name };
	}
	if (request.thread) message.thread = { name: request.thread };

	return message;
}

/**
 * Runs the command of a Chat event for an active member. A change of the
 * member list is announced to the space, anything else is answered privately
 * to the sender. Does nothing for other events.
 */
export function handleCommand(
	event: CommandEvent,
): ChatDataActionResponse | undefined {
	const request = parseCommand(event);
	if (!request) return undefined;

	let reply: Reply;
	try {
		reply = run(request);
	} catch (error) {
		Logger.log(`Command ${request.commandId} failed: ${error}`);
		reply = { text: `Command failed: ${error}` };
	}

	return {
		hostAppDataAction: {
			chatDataAction: {
				createMessageAction: { message: createReplyMessage(reply, request) },
			},
		},
	};
}
