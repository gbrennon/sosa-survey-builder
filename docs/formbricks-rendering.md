# Formbricks rendering

**Navigate:** [Getting started](getting-started.md) ·
[Building a survey](building-a-survey.md) ·
[Survey authoring](survey-authoring.md)

The builder emits two integration surfaces.

## Create through the Formbricks API

Use `survey.payload.json` with the Formbricks management API.

The Formbricks API validates the payload and creates the survey in a workspace.

The endpoint is:

```text
POST /api/v1/management/surveys
```

Send the payload with a Formbricks management API key.

```bash
curl -X POST "$FORMBRICKS_URL/api/v1/management/surveys" \
  -H "content-type: application/json" \
  -H "x-api-key: $FORMBRICKS_API_KEY" \
  --data-binary @dist/survey.payload.json
```

The authoring file must include `workspaceId`.

The generated payload is accepted by the Formbricks workspace create-input contract.

After creation,
Formbricks owns the persisted survey ID,
response storage,
participant identity,
and runtime delivery.

## Render a local fixture

Use `survey.fixture.json` for a local renderer preview.

The fixture contains the survey fields selected by Formbricks' `TJsWorkspaceStateSurvey` type.

A host still supplies styling and callbacks.

Conceptually,
the Formbricks renderer is mounted like this:

```ts
import { renderSurveyInline } from "@formbricks/surveys";
import fixture from "./dist/survey.fixture.json";

renderSurveyInline({
  survey: fixture,
  styling: workspaceStyling,
  isBrandingEnabled: false,
  languageCode: "default",
  containerId: "survey-root",
  mode: "inline",
  isPreviewMode: true,
  onResponse: (response) => console.log(response),
});
```

The exact import and bundling path depends on the Formbricks checkout.

The cloned checkout is the reference for its current renderer API.

## Runtime responsibilities

The fixture does not assign participant IDs.

It does not persist responses.

It does not provide file-upload storage.

Those responsibilities belong to Formbricks or to the host application.

## Compatibility boundary

The builder uses current Formbricks block and element names.

It does not emit the older terminal-only schema that this repository used previously.

Features absent from the Formbricks element schema are rejected during compilation.

This prevents a successful build from producing a survey that renders differently.
It also keeps the generated behavior aligned with the authoring file.
