# Building a survey

**Navigate:** [Getting started](getting-started.md) ·
[Survey authoring](survey-authoring.md) ·
[Conditional logic](conditional-logic.md) ·
[Formbricks rendering](formbricks-rendering.md)

This is the normal workflow for creating a survey.

## 1. Create the authoring file

Start with a JSON file.

```json
{
  "id": "product-research",
  "workspaceId": "cworkspaceexample000000000000",
  "name": "Product research",
  "elements": [
    {
      "id": "instructions",
      "type": "directions",
      "headline": "Tell us about your workflow."
    },
    {
      "id": "workflow",
      "type": "essay",
      "headline": "Describe your current workflow.",
      "required": true
    }
  ]
}
```

See [Survey authoring](survey-authoring.md) for every supported element.

## 2. Add questions

Add new objects to `elements`.

Keep IDs stable.

Use `required: true` when Formbricks should prevent progression without an answer.

Use localized objects for translated headlines,
subheaders,
choice labels,
and ending text.

## 3. Add logic

Add a `rules` array when later elements depend on earlier answers.

```json
{
  "rules": [
    {
      "target": "cloud-provider",
      "mode": "show",
      "all": [
        {
          "element": "architecture-style",
          "operator": "equals",
          "value": "microservices"
        }
      ]
    }
  ]
}
```

See [Conditional logic](conditional-logic.md) for display,
skip,
AND,
OR,
and operator details.

## 4. Validate

```bash
bun run validate survey.json
```

Fix every reported error before compiling.

## 5. Compile

```bash
bun run build survey.json --out-dir dist
```

This writes a create payload and a runtime fixture.

## 6. Render or create it

Use `survey.payload.json` with the Formbricks management API.

Use `survey.fixture.json` when building a local preview around the Formbricks renderer.

The integration details are in [Formbricks rendering](formbricks-rendering.md).

## 7. Change a survey safely

Edit text without changing IDs when possible.

Add choices with new IDs.

Remove rules for deleted elements.

Re-run validation and compilation after every change.

Treat a published ID change as a response-data migration.
