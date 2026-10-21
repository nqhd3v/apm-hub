# apm-hub

Google Apps Script automations for the APM team, written in TypeScript and deployed from GitHub.

The code runs in two Apps Script projects that belong to two different Google accounts. The accounts cannot call each other, so they exchange data through one shared spreadsheet.

```
account `one`                    shared spreadsheet                 account `two`
"APM Leave State"                tabs `daily_data`, `config`        "APM Noti"

plan sheet ──► leaveStateDaily ──► date + email/state/session ──► leaveNotiDaily ──► Google Chat card
               (13:30 daily)                                      (16:30 daily)
```

## Features

| Account | Entrypoint               | Runs          | What it does                                                                                 |
| ------- | ------------------------ | ------------- | -------------------------------------------------------------------------------------------- |
| one     | `leaveStateDaily`        | daily 13:30   | Reads tomorrow's column of the day-off plan sheet and writes who is off to the shared sheet. |
| one     | `scheduleWorklogs`       | Mon–Fri ~07:00 | Creates a one-time trigger of `worklogsDaily` at exactly 09:05 today.                        |
| one     | `worklogsDaily`          | Mon–Fri 09:05 | Posts the Jira worklogs of the last workday, per member, to the team space. See [Worklog report](#worklog-report). |
| two     | `leaveNotiDaily`         | daily 16:30   | Reads the shared sheet and posts the leave reminder card to the team space.                  |
| two     | `handleHalfDaySelection` | button click  | Records Morning / Afternoon for a half-day leave and updates the card.                       |
| two     | `checkReactions`         | every 15 min  | Replies once to each negative reaction on the last leave card.                               |
| two     | `onAppCommand`           | slash command | Runs `/add`, `/remove` and `/status`, see [Chat commands](#chat-commands).                   |

Times are in `Asia/Ho_Chi_Minh`.

## Setup

What you need: two Google accounts (`one` can read the plan sheet, `two` can use Google Chat), a Google Cloud project for the Chat app, a GitHub repository with Actions, and Node 24.

No ID, name or email is stored in the repository. They live in the shared spreadsheet, in GitHub secrets and in Script Properties, as described below.

### 1. Spreadsheets

`samples/` holds an empty copy of each spreadsheet. Upload a copy to Google Drive and open it with Google Sheets, or build your own with the same layout.

| Spreadsheet                                       | Sample                      | Owner  | Shared with                     |
| ------------------------------------------------- | --------------------------- | ------ | ------------------------------- |
| Plan sheet: who is off on which day               | `SAMPLE Calendar.xlsx`      | `one`  | Anyone who plans leave          |
| Shared sheet: data exchanged between the accounts | `SAMPLE Leaving State.xlsx` | either | `one` and `two`, both as editor |

In the plan sheet:

- Turn each member name in column B into a people chip (type `@` and pick the person). The script reads the email of the chip; a row whose name is plain text is ignored. An `.xlsx` file cannot hold chips, so the sample has plain names.
- A leave is a plain number in the column of its date: `1` for a full day, `0.5` for a half day. Text such as `WFH` is ignored.
- If your layout differs from the sample, describe it in `env/one.json`, see [Configuration](#configuration).

In the shared sheet, fill in the `config` tab as described in [Shared sheet contract](#shared-sheet-contract). The space IDs come from step 3.

Note the ID of both spreadsheets: the part of the URL between `/d/` and `/edit`.

### 2. Apps Script projects

On each account:

1. Enable the Apps Script API at <https://script.google.com/home/usersettings>.
2. Create an empty standalone project at <https://script.google.com> and note its script ID (Project Settings, IDs).

The code, the manifest and the list of Google services each project uses are pushed by the deploy, so nothing else has to be set up in the editor yet.

### 3. Chat app

Done with the `two` account. The names of the screens are the ones of the Google Cloud console and can change over time.

1. In a Google Cloud project, enable the Google Chat API.
2. Link the Apps Script project of `two` to that Cloud project (Apps Script editor, Project Settings, Google Cloud Platform project).
3. Create a service account in the Cloud project, create a JSON key for it, and save the whole JSON as the Script Property `CHAT_SERVICE_ACCOUNT` of the `two` project (Project Settings, Script Properties). The app uses it to post messages as itself.
4. In the Chat API configuration, set up the app:
   - connection: Apps Script, with the Head deployment ID of the `two` project (Deploy, Test deployments);
   - triggers: app command to `onAppCommand`, message to `onMessage`;
   - commands: the three slash commands of [Chat commands](#chat-commands), with their IDs;
   - visibility: the people who may install the app.
5. Add the app to the team space and to a test space. The ID of a space is the last part of its URL. Put both IDs in the `config` tab.

### 4. GitHub secrets

Repository settings, Secrets and variables, Actions:

| Secret                    | Value                                                                       |
| ------------------------- | --------------------------------------------------------------------------- |
| `CLASPRC_ONE`             | Content of `~/.clasprc.json` after `npx clasp login` with the `one` account |
| `CLASPRC_TWO`             | The same after logging in with the `two` account                            |
| `ONE_SCRIPT_ID`           | Script ID of the `one` project                                              |
| `TWO_SCRIPT_ID`           | Script ID of the `two` project                                              |
| `CALENDAR_SPREADSHEET_ID` | ID of the plan sheet                                                        |
| `SHARED_SPREADSHEET_ID`   | ID of the shared sheet                                                      |
| `JIRA_BASE_URL`           | Jira site, for example `https://<site>.atlassian.net`                       |
| `JIRA_PROJECT_KEY`        | Project whose worklogs are reported                                         |
| `JIRA_EMAIL`              | Atlassian account Jira is read as. It must be able to browse the project    |
| `JIRA_API_TOKEN`          | API token of that account, see [Worklog report](#worklog-report)            |
| `WORKLOG_DEV_WEBHOOK_URL` | Incoming webhook of the test space: cards in dev mode, report problems      |

The second `clasp login` overwrites `~/.clasprc.json`, so save the first one before logging in again.

### 5. First deploy

1. Push to `develop`. The workflow checks, builds and pushes the code to both projects.
2. In each Apps Script editor, run `setupTriggers` once and accept the authorisation prompt. This creates the scheduled triggers.
3. Add the first members to the `config` tab by hand: the commands only answer to members. To find a Chat user ID, let the person type any command of the app, then read `chat.user.name` in the `command:` line of the execution log of the `two` project.

### 6. Check that it works

1. Set `daily_data!E9` to `DEV`, so that messages go to the test space.
2. Run `leaveStateDaily` in the `one` editor: the `daily_data` tab shows tomorrow's date and who is off.
3. Run `leaveNotiDaily` in the `two` editor: the card appears in the test space, unless nobody is off.
4. Type `/status` in the test space.
5. Clear `E9`.

## Shared sheet contract

The shared spreadsheet has two tabs. Its ID is the `SHARED_SPREADSHEET_ID` secret. `samples/SAMPLE Leaving State.xlsx` is an empty copy with the expected layout.

### `daily_data`

Written by the scripts of both accounts. The layout is defined once in `src/shared/daily-data.ts`.

| Cell      | Written by              | Content                                                                                                        |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `A4`      | one                     | Date the rows are about, `MM/DD/YY`                                                                            |
| `A5:C100` | one, two (session only) | `email`, `state` (`1` full day, `0.5` half day), `session` (`-1` n/a, `0` pending, `1` morning, `2` afternoon) |
| `E5:E7`   | two                     | Last leave card: message name, thread name, users already replied to                                           |
| `E9`      | you                     | Mode flag, see [Testing against the dev space](#testing-against-the-dev-space)                                 |

### `config`

Edited by hand or with the [Chat commands](#chat-commands), and read by the `two` account on every run, so a change is live at the next run without a deploy. The layout is defined in `src/shared/config-data.ts`. The code reads cells by position, the header rows are only labels.

| Cell   | Content                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `B3`   | ID of the team space, without the `spaces/` prefix                                                                                                      |
| `C3`   | ID of the test space, used in dev mode                                                                                                                  |
| `D3`   | Manager as `users/{id}`, addressed directly by the reaction check. Optional                                                                             |
| `E3`   | Team of the [worklog report](#worklog-report), read by `one`: exact Jira team name such as `AM`. Empty for every team of `G3:H`. Optional               |
| `G3:H` | One team of the [worklog report](#worklog-report) per row: Jira team name (`teamKey`), encrypted webhook of its space (`webhook`)                      |
| `A8:E` | One member per row: email on the `one` account, Google Chat user ID, name shown on the card, email on the `two` account (optional), `Inactive` checkbox |

A person on leave who has no row here, or whose row is ticked `Inactive`, is left out of the card. Keep the Chat user ID column formatted as plain text, otherwise Sheets rounds the long number.

## Worklog report

`worklogsDaily` of account `one` runs at 09:05, Monday to Friday. A recurring Apps Script trigger fires anywhere within ±15 minutes of its time, so the exact time takes two steps: five weekly triggers (Monday to Friday) run `scheduleWorklogs` around 07:00, which creates a one-time trigger at exactly 09:05 that day; `worklogsDaily` deletes that trigger when it runs, so they do not pile up toward the limit of 20 triggers per project. Run by hand from the editor, `worklogsDaily` posts right away and leaves the scheduled one in place. It reads the Jira worklogs of the last workday (yesterday, or Friday on Monday) on the issues of `JIRA_PROJECT_KEY` with the Jira REST API, and posts one card per team through the Chat incoming webhook of that team's space. Jira is searched once for every team. From the shared sheet it reads:

- `config!G3:H`, the teams: `teamKey`, the exact name of the Team field in Jira (case and spaces inside count, like `"Team[Team]" = AM` in Jira), and `webhook`, the encrypted webhook URL of the team space. Reading stops at the first row with both cells empty; a row with one empty cell is skipped. Issues of a team that is not listed are not reported;
- `config!E3`, the filter: when set, only the team of that name is reported. When empty, every team of `G3:H` is;
- `daily_data!E9`, the mode flag: while it is `DEV`, every card goes to `WORKLOG_DEV_WEBHOOK_URL`.

A team that fails does not stop the others. When anything went wrong (a skipped row, a filter without row, a webhook that does not decrypt, a Jira or Chat error), one message listing the problems goes to `WORKLOG_DEV_WEBHOOK_URL`. Nothing is sent there when every team got its card, nor when no team is listed.

The card:

- title `Worklogs in last workday`, subtitle the day as `DD/MM/YYYY`;
- the team, the number of members and the total time above the rows;
- one row per person who logged time, most time first: name and total, then the keys of the issues, each a link, such as `APM-41132 · APM-41287`;
- a total under 2/3 of the working day of Jira (Settings, Issues, Time tracking, "Working hours per day"; 8h when it cannot be read) gets the orange clock warning, for example under 5h 20m for an 8h day; 2/3 or more gets the green check. Not a full day, because early in a sprint people work more than they log. The share is `WARNING_RATIO` in `src/one/worklogs/cards.ts`;
- an `Open in Jira` button opens the same search in Jira.

Setup:

1. Create an API token at <https://id.atlassian.com/manage-profile/security/api-tokens> on the account of `JIRA_EMAIL`. That account must be able to browse the project.
2. In the test space: space name, Apps & integrations, Webhooks, add a webhook. Its URL goes to `WORKLOG_DEV_WEBHOOK_URL`.
3. Create a secret with `openssl rand -base64 32`. Save it as the Script Property `WORKLOG_WEBHOOK_SECRET` of the `one` project (editor, Project Settings), and as `WORKLOG_WEBHOOK_SECRET` in your local `.env`.
4. For each team: add a webhook to its space the same way, run `npm run encrypt-webhook -- <teamKey>`, paste the URL at the prompt, and put the printed `v1.…` token in column `H` next to the team name in `G`. A token only opens with the same secret, on the row of the team it was made for. Changing the secret means encrypting every webhook again.
5. Save the [GitHub secrets](#4-github-secrets), deploy, then run `setupTriggers` in the `one` editor and accept the new authorisation prompt (calls to external URLs).

The build writes the Jira token and the test webhook URL into the `Code.js` of `one`, so anyone who can open that Apps Script project can read them, and its Script Properties: keep it unshared, and give the Jira account read access only. People who can only read the shared sheet see the team webhooks encrypted. Never paste a plain webhook URL in the sheet: its version history keeps it. Public holidays are not known to the script: the day after a holiday reports the holiday itself.

## Chat commands

Slash commands of the Chat app of the `two` account. A successful `/add` or `/remove` is announced to everyone in the space where it was typed. Every other reply (`/status`, usage hints, refusals, errors) is only visible to the person who typed the command.

| Command              | ID  | Does                                                                                                                                                                                       |
| -------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/add @member email` | 1   | Adds the mentioned person to the member list, with `email` as their address on the `one` account. If the person or the email already has a row, that row is updated and made active again. |
| `/remove @member` | 2 | Ticks `Inactive` on the row of the mentioned person. The row is kept. |
| `/remove text` | 2 | For a person who left the space and cannot be mentioned: searches `text` (at least 3 characters) in the name and both emails of the member list. Exactly one active match is made inactive; several matches are listed back and nothing is changed. |
| `/status`            | 3   | Shows the mode (`DEV` or `PRD`), the leave date in `daily_data`, who is off, and the number of active members.                                                                             |

The Chat app can be installed by anyone in the organisation, so every command is limited to active members of the `config` tab: the sender is matched by Chat user ID, or by email on the `two` account. Anyone else gets a refusal. The first members have to be entered in the sheet by hand.

Each command must be registered once for the Chat app in the Google Cloud console (Chat API, Configuration, Commands) as a slash command with the ID above. The IDs are defined in `src/two/commands/request.ts`.

## Configuration

| What                                       | Where                                                       | Changed by                                      |
| ------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------- |
| Spaces, manager, members                   | `config` tab of the shared spreadsheet                      | Editing the sheet, or a Chat command            |
| Layout of the plan sheet                   | `env/one.json`                                              | Merging to `develop`                            |
| Spreadsheet and script IDs, `clasp` logins | GitHub Actions secrets                                      | Updating the secret, then re-running the deploy |
| Key of the Chat service account            | Script Property `CHAT_SERVICE_ACCOUNT` of the `two` project | Apps Script editor, Project Settings            |
| Jira login, test webhook                   | GitHub Actions secrets `JIRA_*`, `WORKLOG_DEV_WEBHOOK_URL`, built into `one` | Updating the secret, then re-running the deploy |
| Team webhooks                              | `config!G3:H` encrypted, secret in Script Property `WORKLOG_WEBHOOK_SECRET` of `one` | `npm run encrypt-webhook`, editing the sheet |

### `env/one.json`

Tab name and layout of the plan sheet, typed by `OneEnv` in `src/one/config.ts`. Rows and columns are counted from 1. Account `two` has no file.

| Key                                  | Meaning                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `SHEET_NAME`                         | Tab holding the plan. Change it when the plan moves to a new year                     |
| `DATE_ROW`                           | Row holding one date per column                                                       |
| `MEMBER_NAME_COL`                    | Column holding the people chips                                                       |
| `MEMBER_START_ROW`, `MEMBER_END_ROW` | First and last row that can hold a member                                             |
| `SKIP_ROWS`                          | Rows in that range that are never a member, for example capacity rows holding numbers |

### Build-time IDs

`build.mjs` reads these from the environment and fails when one is missing:

| Variable                         | Used for                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `CALENDAR_SPREADSHEET_ID`        | Plan sheet, injected into the bundle of `one`                                                        |
| `SHARED_SPREADSHEET_ID`          | Shared sheet, injected into the bundle of both accounts                                              |
| `JIRA_*`, `WORKLOG_DEV_WEBHOOK_URL` | Worklog report, injected into the bundle of `one` |
| `ONE_SCRIPT_ID`, `TWO_SCRIPT_ID` | Apps Script project each account is pushed to (`dist/<account>/.clasp.json`). Not part of the bundle |

In CI they are GitHub Actions secrets. To build locally, copy `.env.example` to `.env` and fill it in; `.env` is ignored by git.

## Testing against the dev space

Cell `E9` of `daily_data` switches the `two` account between spaces.

| `E9`                    | Leave card goes to                                    |
| ----------------------- | ----------------------------------------------------- |
| `DEV`                   | Test space (`config!C3`), title prefixed with `[DEV]` |
| anything else, or empty | Team space (`config!B3`)                              |

Replies to button clicks and reactions always go to the space the card is in.

The flag only changes where messages are sent. Dev mode still runs in the production script projects and on the real shared sheet, so:

- set `E9` to `DEV` **before** merging a change you want to try, and clear it when done;
- while it is `DEV`, the team space receives no reminder;
- button clicks in the test space change the real session values in `daily_data`.

To test by hand, run `leaveStateDaily` in the `one` editor, then `leaveNotiDaily` in the `two` editor.

## Development

Requires Node 24.

```
npm install
npm run check      # lint + typecheck + test, same as CI
```

| Command              | Does                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `npm run build`      | Build both accounts into `dist/`. Needs the [build-time IDs](#build-time-ids) |
| `node build.mjs two` | Build one account                                                             |
| `npm test`           | Run tests                                                                     |
| `npm run typecheck`  | Type-check without building                                                   |
| `npm run format`     | Fix formatting and lint issues                                                |

### Project layout

```
env/
  one.json            layout of the plan sheet of account `one`
samples/              empty copies of the two spreadsheets
src/
  shared/             code used by both accounts
    daily-data.ts     contract of the `daily_data` tab: ranges, state and session values
    config-data.ts    contract of the `config` tab
    chat-types.ts     subset of the Chat REST resources, cards included
    date.ts
    triggers.ts
  one/                project of account `one`
    index.ts          entrypoints
    leave-state/
    worklogs/         Jira worklog report: read Jira, build the card, post to the webhook
  two/                project of account `two`
    index.ts          entrypoints
    settings.ts       reads the `config` tab: spaces, manager, members
    chat/             auth, sending
    commands/         slash commands: parsing, member list changes, status
    leave-noti/
__test__/             tests, mirroring src/
build.mjs             bundles each account into dist/<account>/Code.js
```

Each account has one `index.ts`. Every function exported from it becomes a global function in Apps Script, callable by triggers, Chat events and the editor's Run button.

Code that talks to Sheets or Chat is kept in thin functions. Parsing, validation and card building are pure functions, and those are what the tests cover.

## Deployment

`.github/workflows/ci.yml`:

- A pull request targeting `develop` runs `npm run check` (lint, typecheck, tests).
- A push to `develop` runs the same check, then builds both accounts and runs `clasp push` to each Apps Script project. An account whose `CLASPRC_*` secret is missing is skipped with a warning.

`develop` is the only long-lived branch: what is on it is what runs in Apps Script.

Scheduled triggers always run the latest pushed code, so a merge to `develop` is live at the next trigger.

### Things to know

- `clasp` deploys with a personal refresh token. If the organisation forces re-authentication, the deploy job starts failing until the `CLASPRC_*` secret is replaced with a fresh login.
- Changing OAuth scopes in `src/<account>/appsscript.json` requires re-authorising the project by hand in the editor.
- `setupTriggers` deletes all triggers of the project and recreates them. Run it again whenever the trigger list in `index.ts` changes.
- To roll back, revert the commit on `develop`, or restore an earlier version from the Apps Script editor.
