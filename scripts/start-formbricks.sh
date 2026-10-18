#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
formbricks_dir="${1:-${FORMBRICKS_DIR:-$repo_root/../formbricks}}"
compose_file="$formbricks_dir/docker-compose.dev.yml"
env_file="$formbricks_dir/.env"

if ! command -v podman-compose >/dev/null 2>&1; then
  printf 'podman-compose is required\n' >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is required\n' >&2
  exit 1
fi

if [[ ! -d "$formbricks_dir" ]]; then
  printf 'Formbricks checkout not found: %s\n' "$formbricks_dir" >&2
  exit 1
fi

if [[ ! -f "$compose_file" ]]; then
  printf 'Formbricks compose file not found: %s\n' "$compose_file" >&2
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  printf 'Formbricks environment file not found: %s\n' "$env_file" >&2
  exit 1
fi

cd "$formbricks_dir"
podman-compose \
  -p formbricks \
  -f "$compose_file" \
  --env-file "$env_file" \
  up -d

exec pnpm --reporter=append-only dev
