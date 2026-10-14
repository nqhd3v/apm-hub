import type { ChatMessage } from "../../shared/chat-types";
import { DAILY_DATA, isDevMode } from "../../shared/daily-data";
import { CONFIG } from "../config";

/** True while the mode flag of the shared sheet is `DEV`. */
export function readDevMode(): boolean {
	const sheet = SpreadsheetApp.openById(
		CONFIG.SHARED_SPREADSHEET_ID,
	).getSheetByName(DAILY_DATA.TAB);
	if (!sheet) throw new Error(`Sheet "${DAILY_DATA.TAB}" not found.`);

	const flag = sheet.getRange(DAILY_DATA.MODE_CELL).getValue();
	Logger.log(`Mode flag: "${flag}"`);

	return isDevMode(flag);
}

/** Posts `message` through a Google Chat incoming webhook. Throws when Chat refuses it. */
export function sendToWebhook(message: ChatMessage, webhookUrl: string): void {
	const response = UrlFetchApp.fetch(webhookUrl, {
		method: "post",
		contentType: "application/json; charset=UTF-8",
		payload: JSON.stringify(message),
		muteHttpExceptions: true,
	});

	const code = response.getResponseCode();
	if (code < 200 || code >= 300) {
		throw new Error(
			`Chat webhook ${code}: ${response.getContentText().slice(0, 500)}`,
		);
	}
	Logger.log("Sent message to webhook");
}
