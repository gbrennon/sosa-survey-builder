# Formbricks response verification

This guide verifies persisted Formbricks responses after a live survey submission.

## Prerequisites

Complete the import and live-survey steps in
[Formbricks verification](formbricks-verification.md).
Set these shell variables:

```bash
export FORMBRICKS_URL="http://localhost:3000"
export FORMBRICKS_API_KEY="<api-key>"
export SURVEY_ID="<survey-id>"
export SOSA_BUILD_DIR="<build-directory>"
```

Use the live `/s/<survey-id>` URL for submissions.
Preview responses do not count as persisted responses.

## Query persisted responses

After submitting a live response, query the management API:

```bash
curl --fail-with-body --request GET \
  "$FORMBRICKS_URL/api/v1/management/responses?surveyId=$SURVEY_ID" \
  --header "x-api-key: $FORMBRICKS_API_KEY" \
  --output "$SOSA_BUILD_DIR/responses.json"
```

Check the response count without printing the API key:

```bash
bun -e '
const response = await Bun.file(
  `${Bun.env.SOSA_BUILD_DIR}/responses.json`
).json();
console.log(`responses=${response.data.length}`);
'
```

The count must be at least `1` after a successful live submission.
The stored response should include the selected architecture style and conditional answers.

## Verify conditional data

Compare stored responses from these test cases:

- `Microservices` must include a `cloud_provider` answer.
- `Serverless` must not include `cloud_provider` or `architecture_notes`.
- `Monolith` must include an `architecture_notes` answer.

Also verify that each submitted response reaches `Assessment complete` in the browser.

## Clean up the API key

The API key is a credential, not a project artifact.
After verification:

1. Return to **Organization settings → API Keys**.
2. Delete the local verification key.
3. Confirm that the key no longer appears in the list.
4. Remove the shell variables:

```bash
unset FORMBRICKS_API_KEY FORMBRICKS_URL SURVEY_ID SOSA_BUILD_DIR
```
