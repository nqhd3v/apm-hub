import { defineConfig } from "vitest/config";
import one from "./env/one.json" with { type: "json" };

export default defineConfig({
	define: {
		__ENV__: JSON.stringify({
			...one,
			SPREADSHEET_ID: "test",
			SHARED_SPREADSHEET_ID: "test",
			JIRA_PROJECT_KEY: "TEST",
			JIRA_BASE_URL: "https://jira.example",
		}),
	},
});
