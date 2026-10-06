import { formatDate, serialToDate } from "../../shared/date";

/**
 * Cell as returned by the Sheets API with the field mask used in `plan.ts`.
 *
 * Date:   {"formattedValue":"02/14","effectiveFormat":{"numberFormat":{"pattern":"mm/dd","type":"DATE"}},"effectiveValue":{"numberValue":45702}}
 * Chip:   {"formattedValue":"Member Name","effectiveValue":{"stringValue":"Member Name"},"chipRuns":[{"chip":{"personProperties":{"displayFormat":"DEFAULT","email":"member@one.example"}}},{"startIndex":12}]}
 * Number: {"formattedValue":"1","effectiveValue":{"numberValue":1}}
 */
export interface SheetCell {
	formattedValue?: string;
	effectiveValue?: { numberValue?: number; stringValue?: string };
	effectiveFormat?: { numberFormat?: { type?: string } };
	chipRuns?: { chip?: { personProperties?: { email?: string } } }[];
}

export interface SheetRow {
	values?: SheetCell[];
}

export interface Person {
	name: string;
	email: string;
}

/** `MM/DD/YY` for a date cell, otherwise null */
export function formatDateCell(cell: SheetCell | undefined): string | null {
	const serial = cell?.effectiveValue?.numberValue;
	if (cell?.effectiveFormat?.numberFormat?.type !== "DATE") return null;
	if (serial === undefined) return null;

	return formatDate(serialToDate(serial));
}

export function formatPersonCell(cell: SheetCell | undefined): Person | null {
	const email = cell?.chipRuns?.[0]?.chip?.personProperties?.email;
	if (!email) return null;

	return { name: cell?.formattedValue ?? "", email };
}

/** Value of a plain (unformatted) number cell, otherwise null */
export function formatNumericCell(cell: SheetCell | undefined): number | null {
	if (!cell || cell.effectiveFormat) return null;

	return cell.effectiveValue?.numberValue ?? null;
}
