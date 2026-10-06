import { replyInThread } from "../chat/send";
import type { Reaction } from "../chat/types";
import { getSettings } from "../settings";
import { getLastMessageConfig, setLastMessageReactSeen } from "./last-message";

const NEGATIVE_EMOJI = new Set([
	// dislike
	"👎",
	// angry
	"😠",
	"😡",
	"🤬",
	"😤",
	"👿",
	"💢",
	// annoyed / unimpressed
	"🙄",
	"😒",
	"😑",
	// sad / bad reaction
	"🙁",
	"☹️",
	"😞",
	"😔",
	"😢",
	"😭",
	// frustrated
	"😩",
	"😫",
	"🤦",
]);

/** Users who reacted negatively and were not replied to yet. */
export function findBadReactors(
	reactions: Reaction[],
	seen: string[],
): string[] {
	const users = reactions
		.filter(
			(r) =>
				r.user.type === "HUMAN" &&
				r.emoji.unicode !== undefined &&
				NEGATIVE_EMOJI.has(r.emoji.unicode) &&
				!seen.includes(r.user.name),
		)
		.map((r) => r.user.name);

	return Array.from(new Set(users));
}

/** Runs every 15 minutes: replies once to each negative reaction on the last leave card. */
export function checkReactions(): void {
	const config = getLastMessageConfig();
	if (!config.message) return;

	Logger.log(`checking ${config.message} -- ${config.thread}`);
	let reactions: Reaction[];
	try {
		reactions =
			Chat.Spaces.Messages.Reactions.list(config.message, {}).reactions ?? [];
	} catch (e) {
		Logger.log(`Reactions.list failed: ${e}`);
		return;
	}

	Logger.log(JSON.stringify(reactions));
	const badReactors = findBadReactors(reactions, config.seen);
	if (badReactors.length === 0) return;

	const { managerUser } = getSettings();
	const text = badReactors.includes(managerUser)
		? `Hi <${managerUser}>, this got a 👎 from you — what should we improve here?`
		: `Hi ${badReactors.map((name) => `<${name}>`).join(" ")}, sorry this one didn't land well. But I'm sure someone in this group can help make it better — feel free to share what's on your mind.`;

	replyInThread({ text, thread: { name: config.thread } });
	setLastMessageReactSeen([...config.seen, ...badReactors]);
}
