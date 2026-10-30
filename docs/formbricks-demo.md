# Formbricks disposable demo

This guide runs the example survey locally without asking you to create or copy
an API key or workspace ID.

## Prerequisites

Install and verify:

- Bun
- Node.js and pnpm as required by Formbricks
- Docker with Compose (the `docker compose` plugin or legacy `docker-compose`), or
  Podman with `podman-compose`
- `openssl`
- `psql`
- A browser

Run the command from the SOSA repository. Use a disposable local Formbricks
checkout and database. The demo refuses to seed a database that already has any
users, organizations, or workspaces.

## Run the demo

From the repository root:

```bash
./scripts/start-and-ingest-survey.sh --demo
```

## Use a different survey file

The default input is `examples/architecture-survey.json`. Pass another
authoring survey as the first positional argument:

```bash
./scripts/start-and-ingest-survey.sh --demo path/to/my-survey.json
```

You can also provide the Formbricks checkout as the second positional argument:

```bash
./scripts/start-and-ingest-survey.sh \
  --demo \
  path/to/my-survey.json \
  /path/to/formbricks
```

## Choose the Formbricks checkout and revision

These environment variables control the external checkout used by the bootstrap:

```bash
export FORMBRICKS_DIR="$PWD/../formbricks"
export FORMBRICKS_REPOSITORY_URL="https://github.com/formbricks/formbricks.git"
export FORMBRICKS_REF="main"
./scripts/start-and-ingest-survey.sh --demo
```

`FORMBRICKS_DIR` may point to an existing checkout or a path that should be
cloned. `FORMBRICKS_REPOSITORY_URL` and `FORMBRICKS_REF` are used when the
checkout must be cloned. Formbricks source, dependencies, and `.env` stay
outside the SOSA repository.

## Change the URL used by the helper

Set `FORMBRICKS_URL` when Formbricks is reachable at a different base URL:

```bash
FORMBRICKS_URL="http://localhost:3000" \
  ./scripts/start-and-ingest-survey.sh --demo
```

This changes the URL used for readiness checks, API requests, and printed
links. It does not reconfigure the Formbricks dev server port. The web process
continues to use the port configured by the external Formbricks checkout,
normally `3000`.

## Prepare dependencies without starting the web process

For an advanced warm-up, prepare the Formbricks dependencies and Valkey without
starting the host web process:

```bash
FORMBRICKS_PREPARE_ONLY=1 \
  ./scripts/start-formbricks.sh "${FORMBRICKS_DIR:-../formbricks}"
```

The combined `--demo` helper performs this preparation automatically before
migrations, seeding, and survey import.

Runtime selection is automatic: the bootstrap prefers working Podman with
`podman-compose`, then Docker Compose, then legacy `docker-compose`. There is
no separate runtime-selection flag.

The script performs this sequence:

1. Ensures the sibling Formbricks checkout exists at `../formbricks`.
2. Detects Docker Compose or Podman and pulls the Formbricks compose images.
3. Starts the dependency containers and waits for Valkey.
4. Runs Formbricks database migrations.
5. Performs a read-only user, organization, and workspace count check.
6. Seeds the fresh database with Formbricks' supported development seed.
7. Runs `pnpm authzed:backfill --apply`.
8. Starts the Formbricks web application.
9. Builds `examples/architecture-survey.json`.
10. Imports the built payload through the Formbricks management API.

The script prints values similar to:

```text
Demo workspace: clseedworkspace000000000
Demo login: admin@formbricks.com
Demo password: Password#123
Survey ID: <survey-id>
Editor: http://localhost:3000/workspaces/<workspace-id>/surveys/<survey-id>/edit?mode=cx
Live survey: http://localhost:3000/s/<survey-id>
```

The displayed login is a fixed Formbricks development-seed credential. Use it
only for this disposable local demo; never use it on a shared or production
instance. The generated management API key is held internally and is never
printed or written to the SOSA repository.

## Open and publish the survey

1. Open the printed **Editor** URL in your browser.
2. Log in with the printed local demo credentials.
3. Confirm that the generated blocks and questions are present.
4. Choose **Save/Close**, then **Publish** or **Activate** if the Formbricks UI
   presents a separate action.
5. Open the printed **Live survey** URL without `?preview=true`.

Preview mode renders the survey but does not persist responses.

## Test the survey

For the Microservices path, choose **Microservices** as the architecture style.
The capabilities question and then the cloud-provider question should appear.
Finish the survey and confirm that it displays `Assessment complete`.

For the Serverless path, reload the live URL and choose **Serverless**. The
capabilities question should appear, while the cloud-provider and
architecture-notes questions should be skipped.

## Important behavior

- Demo mode never runs `db:seed:clear`.
- A non-empty Formbricks database causes the script to stop before seeding.
- Press `Ctrl+C` in the running helper terminal to stop the host web process.
- The dependency containers remain running for the next local command.
- If Podman is selected and enforces a short-name registry prompt, configure the
  registry resolution first. Alternatively, run the repository's
  `./scripts/start-formbricks.sh ../formbricks` once in a real terminal to
  answer the prompt and pull the images, stop only its web process, then run
  this demo helper. Do not replace the helper with manual containers.

For the credentialed non-demo workflow, use
[Formbricks verification](formbricks-verification.md).
