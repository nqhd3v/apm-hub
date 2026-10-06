import { SESSION_MORNING, SESSION_PENDING } from "../../shared/daily-data";
import type { LeaveStates, MemberLeave } from "../leave-noti/states";

function session(leave: MemberLeave): string {
	if (leave.session === SESSION_PENDING) return "pending";
	return leave.session === SESSION_MORNING ? "morning" : "afternoon";
}

function list(people: string[]): string {
	return people.length ? people.join(", ") : "nobody";
}

/** Text of the `/status` reply. */
export function formatStatus(
	dev: boolean,
	date: string,
	{ fullDay, halfDay }: LeaveStates,
	memberCount: number,
): string {
	return [
		`*Mode:* ${dev ? "DEV (test space)" : "PRD (team space)"}`,
		`*Leave date:* ${date || "not published yet"}`,
		`*Full day (${fullDay.length}):* ${list(fullDay.map((leave) => leave.name))}`,
		`*Half day (${halfDay.length}):* ${list(halfDay.map((leave) => `${leave.name} (${session(leave)})`))}`,
		`*Active members:* ${memberCount}`,
	].join("\n");
}
