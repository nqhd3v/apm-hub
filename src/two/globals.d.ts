/** Chat advanced service (not covered by @types/google-apps-script). */
declare const Chat: {
	Spaces: {
		Messages: {
			create(
				message: import("./chat/types").ChatMessage,
				parent: string,
				optionalArgs?: Record<string, string>,
				headers?: Record<string, string>,
			): import("./chat/types").SentMessage;
			Reactions: {
				list(
					parent: string,
					optionalArgs?: Record<string, string>,
				): { reactions?: import("./chat/types").Reaction[] };
			};
		};
	};
};

/** OAuth2 library (https://github.com/googleworkspace/apps-script-oauth2). */
interface OAuth2Service {
	setTokenUrl(url: string): OAuth2Service;
	setPrivateKey(key: string): OAuth2Service;
	setIssuer(issuer: string): OAuth2Service;
	setSubject(subject: string): OAuth2Service;
	setScope(scope: string[]): OAuth2Service;
	setCache(cache: GoogleAppsScript.Cache.Cache): OAuth2Service;
	setLock(lock: GoogleAppsScript.Lock.Lock): OAuth2Service;
	setPropertyStore(
		store: GoogleAppsScript.Properties.Properties,
	): OAuth2Service;
	hasAccess(): boolean;
	getAccessToken(): string;
	getLastError(): unknown;
}

declare const OAuth2: { createService(name: string): OAuth2Service };
