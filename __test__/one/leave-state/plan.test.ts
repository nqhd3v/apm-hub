import { describe, expect, test } from "vitest";
import type { PlanLayout } from "../../../src/one/config";
import {
	formatDateCell,
	formatNumericCell,
	formatPersonCell,
	type SheetCell,
	type SheetRow,
} from "../../../src/one/leave-state/cells";
import { pickLeaveRows } from "../../../src/one/leave-state/plan";

const date = (serial: number): SheetCell => ({
	formattedValue: "02/14",
	effectiveFormat: { numberFormat: { type: "DATE" } },
	effectiveValue: { numberValue: serial },
});
const chip = (email: string): SheetCell => ({
	formattedValue: email.split("@")[0],
	effectiveValue: { stringValue: email },
	chipRuns: [{ chip: { personProperties: { email } } }, {}],
});
const num = (n: number): SheetCell => ({
	formattedValue: String(n),
	effectiveValue: { numberValue: n },
});
const text = (s: string): SheetCell => ({
	formattedValue: s,
	effectiveValue: { stringValue: s },
});

describe("cells", () => {
	test("date cell", () => {
		expect(formatDateCell(date(45702))).toBe("02/14/25");
		expect(formatDateCell(num(45702))).toBeNull();
		expect(formatDateCell(undefined)).toBeNull();
	});

	test("person chip", () => {
		expect(formatPersonCell(chip("a@one.example"))).toEqual({
			name: "a",
			email: "a@one.example",
		});
		expect(formatPersonCell(text("a"))).toBeNull();
	});

	test("numeric cell ignores formatted and non-number cells", () => {
		expect(formatNumericCell(num(0.5))).toBe(0.5);
		expect(formatNumericCell(date(45702))).toBeNull();
		expect(formatNumericCell(text("WFH"))).toBeNull();
		expect(formatNumericCell({})).toBeNull();
		expect(formatNumericCell(undefined)).toBeNull();
	});
});

describe("pickLeaveRows", () => {
	const layout: PlanLayout = {
		DATE_ROW: 2,
		MEMBER_START_ROW: 3,
		MEMBER_END_ROW: 7,
		MEMBER_NAME_COL: 2,
		SKIP_ROWS: [5],
	};

	const member = (email: string, ...days: SheetCell[]): SheetRow => ({
		values: [{}, chip(email), {}, ...days],
	});
	const rows: SheetRow[] = [
		{ values: [text("title")] },
		{ values: [{}, {}, {}, date(45702), date(45703)] },
		member("full@x", num(1), {}),
		member("half@x", num(0.5), num(1)),
		member("skipped@x", num(1), num(1)),
		member("wfh@x", text("WFH"), {}),
		{ values: [{}, text("no chip"), {}, num(1)] },
		member("out-of-range@x", num(1), num(1)),
	];

	test("returns members with a number in the date column", () => {
		expect(pickLeaveRows(rows, "02/14/25", layout)).toEqual([
			{ name: "full", email: "full@x", state: 1 },
			{ name: "half", email: "half@x", state: 0.5 },
		]);
		expect(pickLeaveRows(rows, "02/15/25", layout)).toEqual([
			{ name: "half", email: "half@x", state: 1 },
		]);
	});

	test("returns null when the date has no column", () => {
		expect(pickLeaveRows(rows, "02/16/25", layout)).toBeNull();
		expect(pickLeaveRows([], "02/14/25", layout)).toBeNull();
	});
});
