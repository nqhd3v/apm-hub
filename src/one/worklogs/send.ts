import type { ChatMessage } from "../../shared/chat-types";

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
