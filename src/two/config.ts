/** Values injected by the build. Everything else is read from the `config` tab, see `settings.ts`. */
export interface TwoEnv {
	/** From the `SHARED_SPREADSHEET_ID` secret */
	SHARED_SPREADSHEET_ID: string;
}

declare const __ENV__: TwoEnv;

export const CONFIG: TwoEnv = __ENV__;

/** Script Properties holding secrets. Set them in the Apps Script editor, never in code. */
export const PROPERTY = {
	/** Full JSON key of the Chat app service account */
	CHAT_SERVICE_ACCOUNT: "CHAT_SERVICE_ACCOUNT",
} as const;
