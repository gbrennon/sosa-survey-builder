#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
survey_path="${1:-$repo_root/examples/architecture-survey.json}"
formbricks_dir="${2:-${FORMBRICKS_DIR:-$repo_root/../formbricks}}"
formbricks_url="${FORMBRICKS_URL:-http://localhost:3000}"
web_pid=""
work_dir=""

cleanup() {
  if [[ -n "$web_pid" ]] && kill -0 "$web_pid" 2>/dev/null; then
    kill -- "-$web_pid" 2>/dev/null || true
    wait "$web_pid" 2>/dev/null || true
  fi
  if [[ -n "$work_dir" ]]; then
    rm -rf "$work_dir"
  fi
}

trap cleanup EXIT INT TERM

if [[ -z "${FORMBRICKS_API_KEY:-}" ]]; then
  printf 'FORMBRICKS_API_KEY is required\n' >&2
  exit 1
fi

if [[ -z "${FORMBRICKS_WORKSPACE_ID:-}" ]]; then
  printf 'FORMBRICKS_WORKSPACE_ID is required\n' >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf 'curl is required\n' >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  printf 'bun is required\n' >&2
  exit 1
fi

if ! command -v setsid >/dev/null 2>&1; then
  printf 'setsid is required\n' >&2
  exit 1
fi

if [[ "$survey_path" != /* ]]; then
  survey_path="$PWD/$survey_path"
fi

if [[ ! -f "$survey_path" ]]; then
  printf 'survey file not found: %s\n' "$survey_path" >&2
  exit 1
fi

work_dir="$(mktemp -d)"

setsid -- "$script_dir/start-formbricks.sh" "$formbricks_dir" &
web_pid=$!

for attempt in {1..60}; do
  if curl --silent --show-error --fail --output /dev/null "$formbricks_url/"; then
    break
  fi
  if ! kill -0 "$web_pid" 2>/dev/null; then
    wait "$web_pid"
    exit 1
  fi
  if [[ "$attempt" -eq 60 ]]; then
    printf 'Formbricks did not become ready at %s\n' "$formbricks_url" >&2
    exit 1
  fi
  sleep 1
done

"$script_dir/build-survey.sh" "$survey_path" "$work_dir"

WORK_DIR="$work_dir" bun -e '
const payloadPath = `${Bun.env.WORK_DIR}/survey.payload.json`;
const outputPath = `${Bun.env.WORK_DIR}/formbricks-payload.json`;
const payload = await Bun.file(payloadPath).json();
payload.workspaceId = Bun.env.FORMBRICKS_WORKSPACE_ID;
await Bun.write(outputPath, JSON.stringify(payload, null, 2));
'

curl --fail-with-body \
  --request POST \
  "$formbricks_url/api/v1/management/surveys" \
  --header "content-type: application/json" \
  --header "x-api-key: $FORMBRICKS_API_KEY" \
  --data-binary "@$work_dir/formbricks-payload.json" \
  --output "$work_dir/create-response.json"

survey_id="$(WORK_DIR="$work_dir" bun -e '
const response = await Bun.file(
  `${Bun.env.WORK_DIR}/create-response.json`
).json();
const surveyId = response.data?.id;
if (typeof surveyId !== "string" || surveyId.length === 0) process.exit(1);
console.log(surveyId);
')"

printf 'Survey ID: %s\n' "$survey_id"
printf 'Editor: %s/workspaces/%s/surveys/%s/edit?mode=cx\n' \
  "$formbricks_url" "$FORMBRICKS_WORKSPACE_ID" "$survey_id"
printf 'Live survey: %s/s/%s\n' "$formbricks_url" "$survey_id"
printf 'Formbricks is running. Press Ctrl+C to stop the web process.\n'

wait "$web_pid"
