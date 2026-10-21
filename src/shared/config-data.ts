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
	/** Team of the worklog report, read by account `one`: empty for every team of the table below, else the exact team name */
	WORKLOG_TEAM_CELL: "E3",
	/** From row 3, under its header row: `teamKey | webhook`, the Jira team name and the encrypted webhook of its space */
	WORKLOG_TEAMS_RANGE: "G3:H",
	WORKLOG_TEAMS_FIRST_ROW: 3,
	/** From row 8, under its header row: `one email | chat id | name | two email | inactive` */
	MEMBERS_RANGE: "A8:E",
	MEMBERS_FIRST_ROW: 8,
	MEMBER_ID_COL: 2,
	MEMBER_INACTIVE_COL: 5,
} as const;
