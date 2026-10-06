import { PROPERTY } from "../config";

const APP_AUTH_OAUTH_SCOPES = ["https://www.googleapis.com/auth/chat.bot"];

interface ServiceAccount {
	client_email: string;
	private_key: string;
	token_uri: string;
}

function getServiceAccount(): ServiceAccount {
	const raw = PropertiesService.getScriptProperties().getProperty(
		PROPERTY.CHAT_SERVICE_ACCOUNT,
	);
	if (!raw) {
		throw new Error(
			`${PROPERTY.CHAT_SERVICE_ACCOUNT} script property is not set.`,
		);
	}

	const account: Partial<ServiceAccount> = JSON.parse(raw);
	if (!account.client_email || !account.private_key || !account.token_uri) {
		throw new Error(
			`${PROPERTY.CHAT_SERVICE_ACCOUNT} is not a service account key.`,
		);
	}

	return account as ServiceAccount;
}

/** `Authorization` header value to call Chat as the app, or null when auth fails. */
export function getToken(): string | null {
	const account = getServiceAccount();
	const service = OAuth2.createService(account.client_email)
		.setTokenUrl(account.token_uri)
		.setPrivateKey(account.private_key)
		.setIssuer(account.client_email)
		.setSubject(account.client_email)
		.setScope(APP_AUTH_OAUTH_SCOPES)
		.setCache(CacheService.getUserCache())
		.setLock(LockService.getUserLock())
		.setPropertyStore(PropertiesService.getScriptProperties());

	if (!service.hasAccess()) {
		Logger.log(`Auth error: ${service.getLastError()}`);
		return null;
	}

	return `Bearer ${service.getAccessToken()}`;
}
