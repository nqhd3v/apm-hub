/** Subset of the Google Chat REST resources used by this project. */

export interface Icon {
	materialIcon: { name: string; fill: boolean };
}

export interface DecoratedText {
	text: string;
	bottomLabel?: string;
	wrapText?: boolean;
	icon?: Icon;
}

export interface Button {
	text: string;
	icon?: Icon;
	color?: { red: number; green: number; blue: number; alpha: number };
	onClick: {
		action: {
			function: string;
			parameters: { key: string; value: string }[];
		};
	};
}

export type Widget =
	| { decoratedText: DecoratedText }
	| { divider: Record<string, never> }
	| { buttonList: { buttons: Button[] } };

export interface Section {
	header?: string;
	collapsible?: boolean;
	uncollapsibleWidgetsCount?: number;
	widgets: Widget[];
}

export interface CardV2 {
	cardId: string;
	card: {
		header?: { title: string; subtitle?: string };
		sections: Section[];
	};
}

export interface ChatMessage {
	text?: string;
	cardsV2?: CardV2[];
	thread?: { name: string };
	privateMessageViewer?: { name: string };
}

export interface SentMessage {
	name: string;
	thread?: { name?: string };
}

export interface Reaction {
	user: { name: string; type?: string };
	emoji: { unicode?: string };
}

export interface ChatUser {
	/** `users/{id}` */
	name: string;
	email: string;
}

export interface ButtonClickEvent {
	commonEventObject: { parameters?: Record<string, string> };
	chat: {
		user: ChatUser;
		buttonClickedPayload: { message: { thread: { name: string } } };
	};
}

export interface Annotation {
	userMention?: {
		user?: { name: string; displayName?: string; type?: string };
	};
}

/** Message that carries a slash command. */
export interface CommandMessage {
	text?: string;
	/** `text` without the mention of the Chat app */
	argumentText?: string;
	annotations?: Annotation[];
	thread?: { name?: string };
	slashCommand?: { commandId?: string | number };
}

/** Event of an app command, or of a message sent to the Chat app. */
export interface CommandEvent {
	chat: {
		user: ChatUser;
		appCommandPayload?: {
			appCommandMetadata?: { appCommandId?: string | number };
			message?: CommandMessage;
		};
		messagePayload?: { message?: CommandMessage };
	};
}

/** Response of an interaction handler that creates or updates a message. */
export interface ChatDataActionResponse {
	hostAppDataAction: {
		chatDataAction:
			| { createMessageAction: { message: ChatMessage } }
			| { updateMessageAction: { message: ChatMessage } };
	};
}
