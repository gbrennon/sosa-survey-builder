#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
survey_path="${1:-$repo_root/examples/architecture-survey.json}"

if [[ "$survey_path" != /* ]]; then
  survey_path="$PWD/$survey_path"
fi

if ! command -v bun >/dev/null 2>&1; then
  printf 'bun is required\n' >&2
  exit 1
fi

if [[ ! -f "$survey_path" ]]; then
  printf 'survey file not found: %s\n' "$survey_path" >&2
  exit 1
fi

cd "$repo_root"
bun run validate "$survey_path"
