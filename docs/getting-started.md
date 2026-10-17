# Getting started

**Navigate:** [Survey authoring](survey-authoring.md) ·
[Building a survey](building-a-survey.md) ·
[Conditional logic](conditional-logic.md) ·
[Formbricks rendering](formbricks-rendering.md) ·
[Formbricks verification](formbricks-verification.md)

## What this project does

SOSA Survey Builder is an authoring compiler.

It converts a small authoring document into a Formbricks survey payload and a renderer fixture.

Formbricks remains responsible for serving the survey,
assigning runtime participant and response IDs,
collecting answers,
and rendering the browser UI.

## Requirements

Install Bun 1.x.

Verify it with:

```bash
bun --version
```

## Validate an authoring file

Use `validate` before compiling:

```bash
bun run validate examples/architecture-survey.json
```

The authoring file must include the Formbricks `workspaceId`.

Validation checks the authoring structure,
localized text,
unique element IDs,
choice IDs,
and rule references.

## Build artifacts

Compile both outputs into `dist/`:

```bash
bun run build examples/architecture-survey.json --out-dir dist
```

The command writes:

```text
dist/survey.payload.json
dist/survey.fixture.json
```

The output IDs are deterministic for the same survey ID and element IDs.

## Build somewhere else

The output directory can be any path:

```bash
bun run build survey.json --out-dir /tmp/my-survey
```

## Common failure

The compiler rejects capabilities that the Formbricks renderer does not represent.

This is intentional.

A rejected survey is safer than an artifact that silently changes the respondent experience.
