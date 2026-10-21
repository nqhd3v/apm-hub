/** Where members and dates sit in the plan sheet (1-based rows and columns). */
export interface PlanLayout {
	MEMBER_START_ROW: number;
	MEMBER_END_ROW: number;
	MEMBER_NAME_COL: number;
	DATE_ROW: number;
	SKIP_ROWS: readonly number[];
}

/** Shape of `env/one.json`, plus the values the build takes from secrets. */
export interface OneEnv extends PlanLayout {
	/** Plan spreadsheet holding the day-off sheet. From the `CALENDAR_SPREADSHEET_ID` secret */
	SPREADSHEET_ID: string;
	SHEET_NAME: string;
	/** From the `SHARED_SPREADSHEET_ID` secret */
	SHARED_SPREADSHEET_ID: string;
	/** Jira site of the worklog report. From the `JIRA_BASE_URL` secret */
	JIRA_BASE_URL: string;
	/** Project whose worklogs are summarised. From the `JIRA_PROJECT_KEY` secret */
	JIRA_PROJECT_KEY: string;
	/** Atlassian account Jira is read as. From the `JIRA_EMAIL` secret */
	JIRA_EMAIL: string;
	/** API token of that account. From the `JIRA_API_TOKEN` secret */
	JIRA_API_TOKEN: string;
	/**
	 * Incoming webhook of the test space: every card in dev mode, and the
	 * problems of the worklog report. From the `WORKLOG_DEV_WEBHOOK_URL` secret
	 */
	WORKLOG_DEV_WEBHOOK_URL: string;
}

/** Injected by the build. */
declare const __ENV__: OneEnv;

export const CONFIG: OneEnv = __ENV__;

/** Script properties of the `one` project */
export const PROPERTY = {
	/** Secret of the team webhooks in `config!H`, see `worklogs/cipher.ts` */
	WORKLOG_WEBHOOK_SECRET: "WORKLOG_WEBHOOK_SECRET",
} as const;
