# Formbricks verification

This guide builds a SOSA survey, imports it into Formbricks,
and verifies conditional questions in the live browser survey.

## Prerequisites

Install and verify these tools:

- Bun 1.x
- Node.js and pnpm, as required by Formbricks
- Podman and `podman-compose`
- `terminal-browser`

Use three terminals:

1. Formbricks dependencies
2. Formbricks web application
3. SOSA survey builder

Keep the Formbricks checkout separate from this SOSA repository.

## Start Formbricks dependencies

Run the supported development setup from the Formbricks checkout:

```bash
cd /path/to/formbricks
pnpm install
pnpm db:up
```

`pnpm db:up` runs the Formbricks development dependency stack.
When using Podman directly, use the equivalent command:

```bash
podman-compose -p formbricks \
  -f docker-compose.dev.yml \
  --env-file .env \
  up -d
```

The dependency stack includes PostgreSQL, Valkey or Redis, Hub, RustFS,
and Cube. It does not start the Formbricks web application.

To start the dependencies and web application together, run the SOSA helper:

```bash
cd /path/to/sosa-survey-builder
./scripts/start-formbricks.sh /path/to/formbricks
```

The helper defaults to a sibling checkout at `../formbricks`.
Override that location with `FORMBRICKS_DIR`:

```bash
FORMBRICKS_DIR=/path/to/formbricks \
  ./scripts/start-formbricks.sh
```

It keeps the web process attached to the terminal so its startup errors remain
visible. Press `Ctrl+C` to stop the web process; it does not run `down` on the
dependency stack.

When using the helper, skip the separate web-start command below.

Keep local secrets in the Formbricks `.env` file.
Never commit them or copy them into the SOSA repository.

Check that the dependencies are running:

```bash
podman ps
```

The Redis or Valkey service must be running on port `6379`.
Do not start an old stopped Formbricks project alongside the active
`formbricks_*` project.

## Start the Formbricks web application

In a second terminal, keep the dependency stack running and start the web
application from the Formbricks checkout:

```bash
cd /path/to/formbricks
pnpm dev
```

The `pnpm dev` command starts the `@formbricks/web` process on port `3000`.
Wait for it to finish compiling before opening the browser.

Check readiness:

```bash
bun -e 'const r = await fetch("http://localhost:3000/"); console.log(r.status)'
```

Continue only when the command prints `200`.
Open the web application at:

```text
http://localhost:3000
```

If the web process reports `ECONNREFUSED` for port `6379`, stop it,
confirm that Redis or Valkey is running, and start `pnpm dev` again.

## Start SOSA and build the survey

In a third terminal, run these commands from the SOSA repository:

```bash
cd /path/to/sosa-survey-builder
bun install
bun run test
bun run validate examples/architecture-survey.json
export SOSA_BUILD_DIR="$(mktemp -d)"
bun run build examples/architecture-survey.json \
  --out-dir "$SOSA_BUILD_DIR"
```

The build writes `survey.payload.json` and `survey.fixture.json`.



## Get the real workspace ID

The example authoring file contains a placeholder workspace ID.
Replace it with the ID of the Formbricks workspace where the survey will be created.

You can find the workspace ID in the Formbricks workspace URL or dashboard.
It usually appears in a URL like this:

```text
http://localhost:3000/workspaces/<workspace-id>/surveys
```

Do not send the placeholder ID from the example to Formbricks.

Create a copy of the payload and replace only its workspace ID:

```bash
bun -e '
const payload = await Bun.file(
  `${Bun.env.SOSA_BUILD_DIR}/survey.payload.json`
).json();
payload.workspaceId = "<workspace-id>";
await Bun.write(
  `${Bun.env.SOSA_BUILD_DIR}/formbricks-payload.json`,
  JSON.stringify(payload, null, 2)
);
'
```

## Create a Formbricks API key

The management API requires an API key.

1. Open Formbricks and log in as an organization owner or manager.
2. Open **Organization settings**.
3. Open **API Keys**.
4. Click **Add API key**.
5. Enter a label such as `SOSA local verification`.
6. Add the target workspace.
7. Grant **Write** workspace access.
8. Create the key.
9. Copy the secret immediately.

Store the secret only in the current shell:

```bash
export FORMBRICKS_API_KEY="<copy-the-key-here>"
```

Do not commit the key or put it in a repository file.

## Create the survey

Set the local Formbricks URL and create the survey:

```bash
export FORMBRICKS_URL="http://localhost:3000"
curl --fail-with-body --request POST \
  "$FORMBRICKS_URL/api/v1/management/surveys" \
  --header "content-type: application/json" \
  --header "x-api-key: $FORMBRICKS_API_KEY" \
  --data-binary @"$SOSA_BUILD_DIR/formbricks-payload.json" \
  --output "$SOSA_BUILD_DIR/create-response.json"
```

Read the created survey ID:

```bash
bun -e '
const response = await Bun.file(
  `${Bun.env.SOSA_BUILD_DIR}/create-response.json`
).json();
console.log(response.data.id);
'
```

Keep that ID in a shell variable:

```bash
export SURVEY_ID="<created-survey-id>"
export WORKSPACE_ID="<workspace-id>"
```

## Publish and open the survey

Open the imported survey editor:

```text
http://localhost:3000/workspaces/<workspace-id>/surveys/<survey-id>/edit?mode=cx
```

Confirm that the editor shows the generated blocks and questions.
Click **Save & Close**.
Formbricks then displays the live survey URL.

The direct respondent URL has this form:

```text
http://localhost:3000/s/<survey-id>
```

Open it with terminal-browser:

```bash
terminal-browser open "$FORMBRICKS_URL/s/$SURVEY_ID"
```

Use the live URL without `?preview=true`.
Preview mode renders the survey but intentionally does not persist responses.

## Verify the conditional questions

The current example has two rules.
`capabilities` is unconditional.
The conditional rules target `cloud_provider` and `architecture_notes`.

**Microservices branch:**
1. Click **Start**.
2. Click **Next** on the introduction.
3. Select **Microservices** for `Which architecture style best describes your system?`.
4. Click **Next**.
5. Confirm that `Which capabilities are in use?` appears.
6. Select one or more capabilities.
7. Confirm that `Which cloud provider hosts the system?` appears.

**Serverless branch:**
1. Reload the live survey URL.
2. Click **Start**.
3. Click **Next** on the introduction.
4. Select **Serverless** for the architecture style.
5. Click **Next**.
6. Confirm capabilities appears, then confirm `cloud_provider` and `architecture_notes` are skipped.

For a non-Serverless response, `architecture_notes` must appear.
This checks both conditional rules:

```text
architecture_style = Microservices -> show cloud_provider
architecture_style = Serverless -> skip architecture_notes
```

## Submit a live response

Continue the positive branch and answer the remaining questions:

1. Select one or more capabilities.
2. Select a cloud provider.
3. Enter an architecture decision.
4. Select a confidence rating.
5. Click **Finish**.

The respondent UI must show:

```text
Assessment complete
```

## Verify response persistence

Follow [response verification](formbricks-response-verification.md) to query
stored responses, verify conditional data, and clean up the API key.

## Expected result

Verification is complete when the payload is accepted, the live survey renders,
the conditional branches behave as documented, and a live response is persisted.
