const DAY_MS = 24 * 60 * 60 * 1000;

/** Sheets serial number → Date */
export function serialToDate(serial: number): Date {
	const epoch = Date.UTC(1899, 11, 30);
	return new Date(epoch + serial * DAY_MS);
}

/** Date formatted `MM/DD/YY` in the script timezone */
export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}

/** Tomorrow formatted `MM/DD/YY` */
export function getDayToCheck(now: number = Date.now()): string {
	return formatDate(new Date(now + DAY_MS));
}

/** Tomorrow formatted `YYYY-MM-DD`, as in JQL */
export function getIsoDayToCheck(now: number = Date.now()): string {
	// "sv-SE" formats as YYYY-MM-DD
	return new Date(now + DAY_MS).toLocaleDateString("sv-SE");
}
