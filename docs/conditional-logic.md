# Conditional logic

**Navigate:** [Getting started](getting-started.md) ·
[Survey authoring](survey-authoring.md) ·
[Building a survey](building-a-survey.md) ·
[Formbricks rendering](formbricks-rendering.md)

Rules control whether a later element is shown or skipped.

Each rule names a target element.

The compiler turns the rule into Formbricks block logic.

## Display a question

Use `mode: "show"` when the target should appear only when the conditions match.

```json
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
```

When the condition is false,
Formbricks jumps past the target block.

## Skip a question

Use `mode: "skip"` when the target should be omitted when the conditions match.

```json
{
  "target": "migration-notes",
  "mode": "skip",
  "all": [
    {
      "element": "architecture-style",
      "operator": "equals",
      "value": "serverless"
    }
  ]
}
```

When the condition is false,
normal block order reaches the target.

## AND and OR groups

Use `all` for an AND group.

Use `any` for an OR group.

A rule must contain exactly one of these properties.

```json
{
  "target": "shared-database-notes",
  "mode": "show",
  "all": [
    { "element": "architecture-style", "operator": "equals", "value": "microservices" },
    { "element": "database", "operator": "equals", "value": "shared" }
  ]
}
```

## Operators

| Authoring operator | Formbricks operator | Value |
| --- | --- | --- |
| `equals` | `equals` | string or number |
| `not_equals` | `doesNotEqual` | string or number |
| `one_of` | `equalsOneOf` | string array |
| `contains` | `contains` | string |
| `includes_one_of` | `includesOneOf` | string array |
| `includes_all_of` | `includesAllOf` | string array |

`is_set` and `is_not_set` are rejected.
Formbricks does not allow these operators for supported SOSA elements.

## Ordering rules

Rules can target any element after the latest element referenced by their conditions.

The compiler evaluates a rule on the latest condition block,
so every condition must reference an earlier element.

The first element cannot be conditional because Formbricks has no prior block from which to jump.

Put directions or a welcome card first when the first content needs to be unconditional.

The compiler rejects unknown targets,
unknown condition references,
and conditions that occur at or after their target.

Multiple rules may share a condition block.
