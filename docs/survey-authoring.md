# Survey authoring

**Navigate:** [Getting started](getting-started.md) ·
[Building a survey](building-a-survey.md) ·
[Conditional logic](conditional-logic.md) ·
[Examples](examples.md)

A survey is a JSON object with a `name` and an ordered `elements` array.

Every element needs a stable `id`.

IDs are used by Formbricks response data and by conditional logic.

Do not change an ID after a survey is published.
Only change it when intentionally migrating response data.

## Minimal survey

```json
{
  "id": "customer-feedback",
  "workspaceId": "cworkspaceexample000000000000",
  "name": "Customer feedback",
  "elements": [
    {
      "id": "satisfaction",
      "type": "scale",
      "headline": "How satisfied are you?",
      "min": 1,
      "max": 5
    }
  ]
}
```
Replace the example `workspaceId` with a real Formbricks workspace ID before sending the payload.


## Adding a question

1. Open the survey JSON file.
2. Add an object to the end of `elements`.
3. Give it a unique stable `id`.
4. Set the authoring `type`.
5. Add the type-specific fields.
6. Run validation.
7. Compile the survey again.

Example short text question:

```json
{
  "id": "team-size",
  "type": "short_text",
  "headline": "How many people are on your team?",
  "inputType": "number",
  "required": true,
  "charLimit": { "max": 4 }
}
```

Example essay question:

```json
{
  "id": "architecture-notes",
  "type": "essay",
  "headline": "Describe the most important architecture decision.",
  "charLimit": { "max": 2000 }
}
```

## Directions

Use `directions` for text that does not collect a response.

It compiles to a Formbricks informational `cta` element.

```json
{
  "id": "instructions",
  "type": "directions",
  "headline": "There are no right or wrong answers.",
  "subheader": "Choose the answer that best describes your system."
}
```

## Scales

Formbricks rating scales start at `1`.

Supported maximums are `3`, `4`, `5`, `6`, `7`, and `10`.

Use `lowerLabel` and `upperLabel` for the two supported endpoint labels.

```json
{
  "id": "confidence",
  "type": "scale",
  "headline": "How confident are you?",
  "min": 1,
  "max": 5,
  "scale": "number",
  "lowerLabel": "Not confident",
  "upperLabel": "Very confident"
}
```

Per-value labels are not representable by the Formbricks element schema.
Randomized scale direction is not representable either.

The compiler rejects them.

## Choice questions

Use `single_select` for one answer.

Use `multiselect` for multiple answers.

Every choice needs an ID and a label.

```json
{
  "id": "deployment",
  "type": "single_select",
  "headline": "Where is the system deployed?",
  "choices": [
    { "id": "cloud", "label": "Cloud" },
    { "id": "on-prem", "label": "On-premises" }
  ]
}
```

Enable randomization with `randomize: true`.

Use the reserved choice ID `none` to keep a none-of-the-above option anchored.

Use `other` to add Formbricks' open-text other option:

```json
{
  "id": "tools",
  "type": "multiselect",
  "headline": "Which tools do you use?",
  "randomize": true,
  "anchoredChoiceIds": ["none"],
  "other": { "placeholder": "Name another tool" },
  "choices": [
    { "id": "redis", "label": "Redis" },
    { "id": "none", "label": "None of the above" }
  ]
}
```

Formbricks automatically treats the `none` choice as exclusive in a multi-select element.

## Localization

A plain string becomes the Formbricks `default` locale.

Use an object when supplying translations:

```json
{
  "headline": {
    "default": "How satisfied are you?",
    "de": "Wie zufrieden sind Sie?"
  }
}
```

Every localized object must contain `default`.

## Editing and deleting

Edit the headline or type-specific fields in place.

To add a choice,
append it to `choices` with a new stable ID.

To remove a choice,
remove its object from `choices`.

To delete a question,
remove its element object and any rules that target it.

Run validation after every structural change.
