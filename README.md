# SOSA Survey Builder

SOSA Survey Builder compiles human-readable survey authoring files into artifacts.
Those artifacts can be rendered by Formbricks.

It does not run a survey in a terminal.

It produces two JSON files:

- `survey.payload.json` is a Formbricks survey-create payload.
- `survey.fixture.json` is a local renderer fixture with runtime defaults.

## Quick start

Install [Bun](https://bun.sh/).

Validate an authoring file:

```bash
bun run validate examples/architecture-survey.json
```

Build both Formbricks artifacts:

```bash
bun run build examples/architecture-survey.json --out-dir dist
```

The full workflow is documented in [Getting started](docs/getting-started.md).

## Documentation

- [Getting started](docs/getting-started.md) explains installation,
  validation,
  compilation,
  and output usage.
- [Survey authoring](docs/survey-authoring.md) explains how to add,
  edit,
  localize,
  and remove questions.
- [Conditional logic](docs/conditional-logic.md) explains display and skip rules.
- [Building a survey](docs/building-a-survey.md) is the end-to-end guide.
- [Formbricks rendering](docs/formbricks-rendering.md) explains API and fixture integration.
- [Formbricks verification](docs/formbricks-verification.md) provides the
  complete import, publishing, and conditional-question verification workflow.
- [Formbricks disposable demo](docs/formbricks-demo.md) explains how to pull
  images, seed a fresh local instance, import the example, and open it in a
  browser without user-supplied credentials.
- [Examples](docs/examples.md) explains the included assessment.
- [Development](docs/development.md) explains tests and project structure.

## Supported authoring elements

- `directions` compiles to an informational Formbricks `cta` element.
- `scale` compiles to a Formbricks `rating` element.
- `multiselect` compiles to `multipleChoiceMulti`.
- `single_select` compiles to `multipleChoiceSingle`.
- `essay` and `short_text` compile to `openText`.
- `date` compiles to a Formbricks `date` element.

The compiler rejects features that Formbricks cannot render faithfully.

For example,
  arbitrary scale minimums,
  per-value scale labels,
  and randomized scale direction are rejected instead of silently discarded.

## Authoring guide

See the [survey authoring guide](docs/survey-authoring.md) for the supported
document structure and Formbricks compatibility rules.

## Automate validation and builds

Validate the default example:

```bash
./scripts/validate-survey.sh
```

Build the default example into `dist/`:

```bash
./scripts/build-survey.sh
```

Use a custom authoring file and output directory:

```bash
./scripts/build-survey.sh survey.json /tmp/my-survey
```

Formbricks owns participant identity,
response identity,
response persistence,
and the browser renderer.

This repository owns authoring validation,
ID preservation,
localization conversion,
conditional-flow compilation,
and artifact generation.
