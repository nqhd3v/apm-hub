import { expect, test } from "vitest";
import { formatDate, getDayToCheck, serialToDate } from "../../src/shared/date";

test("serial number becomes MM/DD/YY", () => {
	// 45702 is the serial of 2025-02-14 (see the cell sample in one/leave-state/cells.ts)
	expect(formatDate(serialToDate(45702))).toBe("02/14/25");
});

test("day to check is tomorrow in the script timezone", () => {
	// 2026-10-03 23:30 in Asia/Ho_Chi_Minh
	const now = Date.UTC(2026, 9, 3, 16, 30);
	expect(getDayToCheck(now)).toBe("10/04/26");
});
