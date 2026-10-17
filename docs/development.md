# Development

**Navigate:** [Getting started](getting-started.md) ·
[Survey authoring](survey-authoring.md) ·
[Formbricks rendering](formbricks-rendering.md)

## Project layout

```text
src/schema.ts       authoring and output types
src/validate.ts     authoring input validation
src/compiler.ts     Formbricks payload and fixture compilation
src/cli.ts          validate and build commands
tests/              compiler and validation tests
examples/           authoring examples
docs/               user guides
```

## Run tests

```bash
bun test
```

Run the TypeScript check with:

```bash
bunx --bun tsc --noEmit
```

Run a smoke build with:

```bash
bun run build examples/architecture-survey.json --out-dir /tmp/sosa-survey-build
```

## Design boundaries

The compiler is deterministic.

It preserves authoring element and choice IDs.

It derives Formbricks block,
logic,
and ending IDs from the survey ID and element IDs.

It emits `questions: []` and uses modern Formbricks `blocks`.

It does not implement a second survey renderer.

It does not collect participant answers.

It does not invent Formbricks features that are absent from the cloned reference checkout.

## Adding an authoring feature

1. Confirm that the Formbricks type and renderer support the capability.
2. Add the authoring type in `src/schema.ts`.
3. Add structural checks in `src/validate.ts`.
4. Add the compiler mapping in `src/compiler.ts`.
5. Add a behavioral compiler test.
6. Update the authoring and rendering guides.
7. Run tests,
   TypeScript checking,
   and a real artifact build.

Reject unsupported capabilities rather than silently dropping fields.
