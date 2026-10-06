/**
 * Contract of the `config` tab of the shared spreadsheet
 */
export const CONFIG_DATA = {
	TAB: "config",
	/** Row 3, under its header row: `one space | two space | dev space | manager` */
	VALUES_RANGE: "A3:D3",
	TWO_SPACE_COL: 2,
	DEV_SPACE_COL: 3,
	MANAGER_COL: 4,
	/** From row 8, under its header row: `one email | chat id | name | two email | inactive` */
	MEMBERS_RANGE: "A8:E",
	MEMBERS_FIRST_ROW: 8,
	MEMBER_ID_COL: 2,
	MEMBER_INACTIVE_COL: 5,
} as const;
