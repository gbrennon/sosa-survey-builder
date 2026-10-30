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
