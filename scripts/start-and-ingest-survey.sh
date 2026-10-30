#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--demo] [survey.json] [formbricks-dir]\n' "$0" >&2
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
demo_mode=0
positional=()

while (($# > 0)); do
  case "$1" in
    --demo)
      demo_mode=1
      ;;
    --)
      shift
      positional+=("$@")
      break
      ;;
    -*)
      usage
      exit 2
      ;;
    *)
      positional+=("$1")
      ;;
  esac
  shift
done

if ((${#positional[@]} > 2)); then
  usage
  exit 2
fi

survey_path="${positional[0]:-$repo_root/examples/architecture-survey.json}"
formbricks_dir="${positional[1]:-${FORMBRICKS_DIR:-$repo_root/../formbricks}}"
compose_project="formbricks"
compose_file="$formbricks_dir/docker-compose.dev.yml"
env_file="$formbricks_dir/.env"
container_runtime=""
container_cli=""
compose_cmd=()
source "$script_dir/formbricks-runtime.sh"
formbricks_url="${FORMBRICKS_URL:-http://localhost:3000}"
formbricks_api_key="${FORMBRICKS_API_KEY:-}"
formbricks_workspace_id="${FORMBRICKS_WORKSPACE_ID:-}"
seed_api_key=""
demo_login_email=""
demo_login_password=""
web_pid=""
prepare_pid=""
work_dir=""

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s is required\n' "$command_name" >&2
    exit 1
  fi
}

stop_process_group() {
  local pid="$1"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -- "-$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  stop_process_group "$web_pid"
  stop_process_group "$prepare_pid"
  if [[ -n "$work_dir" ]]; then
    rm -rf "$work_dir"
  fi
  unset SEED_API_KEY
}

trap cleanup EXIT INT TERM

require_command curl
require_command bun
require_command setsid

if [[ "$demo_mode" == "1" ]]; then
  require_command openssl
  require_command pnpm
  select_formbricks_runtime
  seed_api_key="$(openssl rand -hex 32)"
  formbricks_api_key="fbk_${seed_api_key}"
  formbricks_workspace_id="clseedworkspace000000000"
  demo_login_email="admin@formbricks.com"
  demo_login_password="Password#123"
else
  if [[ -z "$formbricks_api_key" ]]; then
    printf 'FORMBRICKS_API_KEY is required\n' >&2
    exit 1
  fi
  if [[ -z "$formbricks_workspace_id" ]]; then
    printf 'FORMBRICKS_WORKSPACE_ID is required\n' >&2
    exit 1
  fi
fi

if [[ "$survey_path" != /* ]]; then
  survey_path="$PWD/$survey_path"
fi

if [[ ! -f "$survey_path" ]]; then
  printf 'survey file not found: %s\n' "$survey_path" >&2
  exit 1
fi

start_formbricks() {
  if [[ "$1" == "prepare" ]]; then
    setsid -- env FORMBRICKS_PREPARE_ONLY=1 \
      "$script_dir/start-formbricks.sh" "$formbricks_dir" &
    prepare_pid=$!
  else
    setsid -- "$script_dir/start-formbricks.sh" "$formbricks_dir" &
    web_pid=$!
  fi
}

read_database_url() {
  local line value
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*DATABASE_URL[[:space:]]*=(.*)$ ]]; then
      value="${BASH_REMATCH[1]}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
      printf '%s\n' "$value"
      return 0
    fi
  done < "$formbricks_dir/.env"
  return 1
}

run_formbricks_migrations() {
  (
    cd "$formbricks_dir"
    pnpm --filter=@formbricks/database db:migrate:dev
  )
}

database_counts() {
  local db_url="$1"
  formbricks_compose exec -T postgres psql "$db_url" -X -v ON_ERROR_STOP=1 -Atc \
    'SELECT (SELECT COUNT(*) FROM "User") || '"'"'|'"'"' || (SELECT COUNT(*) FROM "Organization") || '"'"'|'"'"' || (SELECT COUNT(*) FROM "Workspace");'
}

assert_empty_formbricks_database() {
  local counts="$1"
  local user_count organization_count workspace_count
  if [[ ! "$counts" =~ ^[0-9]+\|[0-9]+\|[0-9]+$ ]]; then
    printf 'Formbricks database preflight returned an invalid result\n' >&2
    exit 1
  fi
  IFS='|' read -r user_count organization_count workspace_count <<< "$counts"
  if ((user_count > 0 || organization_count > 0 || workspace_count > 0)); then
    printf 'Formbricks demo requires an empty database (users=%s organizations=%s workspaces=%s)\n' \
      "$user_count" "$organization_count" "$workspace_count" >&2
    exit 1
  fi
}

seed_formbricks_demo() {
  (
    cd "$formbricks_dir"
    SEED_API_KEY="$seed_api_key" pnpm --filter=@formbricks/database db:seed
    pnpm authzed:backfill --apply
  )
}

prepare_formbricks_demo() {
  local db_url counts
  run_formbricks_migrations
  db_url="$(read_database_url)" || {
    printf 'DATABASE_URL is missing from Formbricks .env\n' >&2
    exit 1
  }
  if [[ "$db_url" == *'?schema=public' ]]; then
    db_url="${db_url%\?schema=public}"
  fi
  counts="$(database_counts "$db_url")"
  assert_empty_formbricks_database "$counts"
  seed_formbricks_demo
}

work_dir="$(mktemp -d)"

if [[ "$demo_mode" == "1" ]]; then
  start_formbricks prepare
  if ! wait "$prepare_pid"; then
    prepare_pid=""
    exit 1
  fi
  prepare_pid=""
  prepare_formbricks_demo
fi

start_formbricks web

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

FORMBRICKS_WORKSPACE_ID="$formbricks_workspace_id" WORK_DIR="$work_dir" bun -e '
const payloadPath = Bun.env.WORK_DIR + "/survey.payload.json";
const outputPath = Bun.env.WORK_DIR + "/formbricks-payload.json";
const payload = await Bun.file(payloadPath).json();
payload.workspaceId = Bun.env.FORMBRICKS_WORKSPACE_ID;
await Bun.write(outputPath, JSON.stringify(payload, null, 2));
'

curl --fail-with-body \
  --request POST \
  "$formbricks_url/api/v1/management/surveys" \
  --header "content-type: application/json" \
  --header "x-api-key: $formbricks_api_key" \
  --data-binary "@$work_dir/formbricks-payload.json" \
  --output "$work_dir/create-response.json"

survey_id="$(WORK_DIR="$work_dir" bun -e '
const response = await Bun.file(
  Bun.env.WORK_DIR + "/create-response.json"
).json();
const surveyId = response.data?.id;
if (typeof surveyId !== "string" || surveyId.length === 0) process.exit(1);
console.log(surveyId);
')"

if [[ "$demo_mode" == "1" ]]; then
  printf 'Demo workspace: %s\n' "$formbricks_workspace_id"
  printf 'Demo login: %s\n' "$demo_login_email"
  printf 'Demo password: %s\n' "$demo_login_password"
fi
printf 'Survey ID: %s\n' "$survey_id"
printf 'Editor: %s/workspaces/%s/surveys/%s/edit?mode=cx\n' \
  "$formbricks_url" "$formbricks_workspace_id" "$survey_id"
printf 'Live survey: %s/s/%s\n' "$formbricks_url" "$survey_id"
printf 'Formbricks is running. Press Ctrl+C to stop the web process.\n'

wait "$web_pid"
