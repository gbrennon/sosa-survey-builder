# Examples

**Navigate:** [Getting started](getting-started.md) ·
[Survey authoring](survey-authoring.md) ·
[Conditional logic](conditional-logic.md) ·
[Formbricks rendering](formbricks-rendering.md)

## Architecture assessment

[`architecture-survey.json`](../examples/architecture-survey.json) demonstrates:

- directions content,
- single-select questions,
- randomized multi-select options,
- anchored `none` options,
- an `other` text response,
- essay input,
- numeric scales,
- localization,
- display rules,
- and skip rules.

Validate and compile it with:

```bash
bun run validate examples/architecture-survey.json
bun run build examples/architecture-survey.json --out-dir dist
```

Inspect the generated block flow:

```bash
bun -e 'const s = await Bun.file("dist/survey.payload.json").json(); console.log(s.blocks)'
```

The generated payload is ready for a Formbricks survey-create request.

The generated fixture is ready to pass to a local Formbricks renderer harness.

## Visualize the compiled survey

The CLI produces JSON artifacts.
It does not open a browser or run a survey by itself.
The practical visualization path is to import the payload into Formbricks.

## Build the artifacts

Run this from the SOSA repository:

```bash
cd /home/gbrennon/Documents/repos/gbrennon/sosa-survey-builder
bun run validate examples/architecture-survey.json
bun run build examples/architecture-survey.json --out-dir dist
```

Confirm that these files exist:

```text
dist/survey.payload.json
dist/survey.fixture.json
```

## Start and sign in to Formbricks

From the Formbricks checkout, prepare the development environment:

```bash
cd /home/gbrennon/Documents/repos/gbrennon/formbricks
pnpm dev:setup
```

Start the dependency containers:

```bash
podman-compose -f docker-compose.dev.yml up -d
podman-compose -f docker-compose.dev.yml ps
```

Keep the dependency terminal running.
The development compose file starts dependencies; it does not provide the
Formbricks web process.

The repository's `pnpm dev:authzed` script currently invokes `docker compose`.
For this Podman setup, verify the already-running SpiceDB service directly:

```bash
cd /home/gbrennon/Documents/repos/gbrennon/formbricks
pnpm exec dotenv -e .env -- pnpm authzed:upgrade check
```

The check must report `health.status` as `healthy` and the schema as `matched`.
If the schema is not prepared, run this once and then repeat the check:

```bash
pnpm exec dotenv -e .env -- pnpm authzed:upgrade prepare
```

Keep the dependency terminal running.
Open a second terminal and start the web application:

```bash
cd /home/gbrennon/Documents/repos/gbrennon/formbricks
pnpm dev
```

Wait for the development server to report that it is ready.
Then open:

```text
http://localhost:3000
```

The `-f` option belongs before the `up` subcommand.
The command `podman-compose up -f docker-compose.dev.yml` fails because
`-f` is being passed as an argument to `up`.
## Create a local verification account
For a fresh local verification instance, create a disposable account.
Use **Sign up** or **Create account**, if that option is shown:

```text
Email:    foo@bar.com
Password: fooPw123@
```

Use these credentials only on your local Formbricks instance.
Do not reuse them on a reachable or production deployment.

If the screen only offers **Continue with Email**, enter `foo@bar.com`.
The development compose file includes MailHog for local email:

```text
http://localhost:8025
```

Open the newest Formbricks message there and click its sign-in link.
The local SMTP configuration uses host `localhost` and port `1025`.
If the account already exists, use the existing-account login path.

## Import the compiled survey

Find the workspace ID in the Formbricks workspace URL.
Create a copy of the payload with that real workspace ID:

```bash
bun -e '
const payload = await Bun.file("dist/survey.payload.json").json();
payload.workspaceId = "<workspace-id>";
await Bun.write("/tmp/sosa-formbricks-payload.json", JSON.stringify(payload, null, 2));
'
```

Create a Formbricks API key through **Organization settings → API Keys**.
Grant the key **Write** access to the target workspace.
Store it only in the current shell:

```bash
export FORMBRICKS_URL="http://localhost:3000"
export FORMBRICKS_API_KEY="<api-key>"
```

Import the payload:

```bash
curl --fail-with-body --request POST \
  "$FORMBRICKS_URL/api/v1/management/surveys" \
  --header "content-type: application/json" \
  --header "x-api-key: $FORMBRICKS_API_KEY" \
  --data-binary @/tmp/sosa-formbricks-payload.json \
  --output /tmp/sosa-create-response.json
```

Read the created survey ID:

```bash
export SURVEY_ID="$(bun -e '
const response = await Bun.file("/tmp/sosa-create-response.json").json();
console.log(response.data.id);
')"
```

Open the editor:

```text
http://localhost:3000/workspaces/<workspace-id>/surveys/<survey-id>/edit?mode=cx
```

Click **Save & Close** in Formbricks.
Then open the live respondent URL:

```text
http://localhost:3000/s/<survey-id>
```

Use the live URL without `?preview=true`.
Preview mode renders the survey but does not persist responses.

## Verify the conditional questions

In the live survey:

1. Select **Microservices**.
2. Confirm that the capabilities question appears.
3. Confirm that the cloud-provider question appears.
4. Start a new response and select **Serverless**.
5. Confirm that capabilities appears.
6. Confirm that cloud provider and architecture notes are skipped.

The generated fixture is an integration input for a Formbricks renderer harness.
It is not a directly viewable HTML page, a persisted survey, or a response store.

For the full response-persistence check and API-key cleanup steps, see
[Formbricks verification](formbricks-verification.md).

## Evaluate responses and results

Create at least three live responses so that the results are meaningful.
Use the same live `/s/<survey-id>` URL for every response.

Use these test cases:

| Case | Architecture | Expected behavior |
| --- | --- | --- |
| A | Microservices | Capabilities, cloud provider, and notes appear |
| B | Serverless | Capabilities appears; cloud provider and notes are skipped |
| C | Monolith | Capabilities and notes appear |

Submit each case with different answers.
After each submission, confirm that the respondent sees `Assessment complete`.

In the Formbricks dashboard, open the survey and inspect:

1. **Summary** for response count, completion data, and question summaries.
2. **Responses** for individual answer records.
3. The response filters for **All**, **Complete**, and **Partial** responses.
4. The response detail view for the exact answers and skipped fields.
5. The response export control for CSV or XLSX output, if enabled in the local build.

The direct dashboard paths are:

```text
http://localhost:3000/workspaces/<workspace-id>/surveys/<survey-id>/summary
http://localhost:3000/workspaces/<workspace-id>/surveys/<survey-id>/responses
```

For the strongest conditional-logic check, compare stored responses:

- Case A must contain `architecture_style=microservices` and a
  `cloud_provider` answer.
- Case B must contain `architecture_style=serverless` and no answer for
  `cloud_provider` or `architecture_notes`.
- Case C must contain `architecture_style=monolith` and an
  `architecture_notes` answer.

## Heatmap availability

This survey is a Formbricks link survey.
Formbricks does not provide a click heatmap or screen heatmap for this survey.
The Formbricks codebase lists Qualtrics heat-map questions as unsupported
imports, which is different from analytics for a link survey.

You can investigate response summaries, individual responses, filters, exports,
completion status, and conditional-answer persistence.
You cannot use this survey to investigate click coordinates, scroll depth, or
visual hotspots without adding a separate analytics tool.
