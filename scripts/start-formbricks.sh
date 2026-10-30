#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
formbricks_dir="${1:-${FORMBRICKS_DIR:-$repo_root/../formbricks}}"
default_formbricks_repository_url="https://github.com/formbricks/formbricks.git"
formbricks_repository_url="${FORMBRICKS_REPOSITORY_URL:-$default_formbricks_repository_url}"
formbricks_ref="${FORMBRICKS_REF:-main}"
compose_file="$formbricks_dir/docker-compose.dev.yml"
env_file="$formbricks_dir/.env"
compose_project="formbricks"
required_services=(postgres valkey rustfs spicedb hub hub-worker cube)

if ! command -v podman >/dev/null 2>&1; then
  printf 'podman is required\n' >&2
  exit 1
fi

if ! command -v podman-compose >/dev/null 2>&1; then
  printf 'podman-compose is required\n' >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is required\n' >&2
  exit 1
fi

validate_existing_formbricks_checkout() {
  if ! git -C "$formbricks_dir" rev-parse --show-toplevel >/dev/null 2>&1; then
    printf 'Formbricks checkout is not a Git repository: %s\n' "$formbricks_dir" >&2
    exit 1
  fi
  if [[ ! -f "$formbricks_dir/package.json" ]]; then
    printf 'Formbricks package manifest not found: %s\n' "$formbricks_dir" >&2
    exit 1
  fi
}

ensure_formbricks_checkout() {
  if ! command -v git >/dev/null 2>&1; then
    printf 'git is required to bootstrap Formbricks\n' >&2
    exit 1
  fi
  if [[ -d "$formbricks_dir" ]]; then
    validate_existing_formbricks_checkout
    return
  fi
  if [[ -e "$formbricks_dir" ]]; then
    printf 'Formbricks path is not a directory: %s\n' "$formbricks_dir" >&2
    exit 1
  fi
  printf 'Cloning Formbricks into %s\n' "$formbricks_dir"
  git clone --branch "$formbricks_ref" --depth 1 \
    "$formbricks_repository_url" "$formbricks_dir"
}

ensure_formbricks_checkout

if [[ ! -f "$compose_file" ]]; then
  printf 'Formbricks compose file not found: %s\n' "$compose_file" >&2
  exit 1
fi

services_are_running() {
  local service container status
  for service in "${required_services[@]}"; do
    container="${compose_project}_${service}_1"
    status="$(
      podman container inspect "$container" \
        --format '{{.State.Status}}' 2>/dev/null || true
    )"
    if [[ "$status" != "running" ]]; then
      return 1
    fi
  done
}

cd "$formbricks_dir"

if [[ ! -d node_modules ]]; then
  pnpm install --frozen-lockfile
fi

pnpm dev:setup

if [[ ! -f "$env_file" ]]; then
  printf 'Formbricks environment file not found: %s\n' "$env_file" >&2
  exit 1
fi

if ! services_are_running; then
  compose_status=0
  podman-compose \
    -p "$compose_project" \
    -f "$compose_file" \
    --env-file "$env_file" \
    up -d || compose_status=$?

  if ! services_are_running; then
    if [[ "$compose_status" -ne 0 ]]; then
      exit "$compose_status"
    fi
    printf 'Formbricks dependency services are not running\n' >&2
    exit 1
  fi

  if [[ "$compose_status" -ne 0 ]]; then
    printf 'compose reported an init-container warning; required services are running\n' >&2
  fi
fi

for _ in {1..30}; do
  if podman-compose \
    -p "$compose_project" \
    -f "$compose_file" \
    --env-file "$env_file" \
    exec -T valkey valkey-cli ping 2>/dev/null | grep -q '^PONG$'; then
    exec pnpm --reporter=append-only --filter @formbricks/web dev
  fi
  sleep 1
done

printf 'Valkey did not become ready on the Formbricks compose stack\n' >&2
exit 1
