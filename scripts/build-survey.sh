#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
survey_path="${1:-$repo_root/examples/architecture-survey.json}"
output_dir="${2:-$repo_root/dist}"

if [[ "$survey_path" != /* ]]; then
  survey_path="$PWD/$survey_path"
fi

if [[ "$output_dir" != /* ]]; then
  output_dir="$PWD/$output_dir"
fi

if ! command -v bun >/dev/null 2>&1; then
  printf 'bun is required\n' >&2
  exit 1
fi

if [[ ! -f "$survey_path" ]]; then
  printf 'survey file not found: %s\n' "$survey_path" >&2
  exit 1
fi

"$script_dir/validate-survey.sh" "$survey_path"
mkdir -p "$output_dir"
cd "$repo_root"
bun run build "$survey_path" --out-dir "$output_dir"

for artifact in survey.payload.json survey.fixture.json; do
  artifact_path="$output_dir/$artifact"
  if [[ ! -s "$artifact_path" ]]; then
    printf 'missing build artifact: %s\n' "$artifact_path" >&2
    exit 1
  fi
  printf '%s\n' "$artifact_path"
done
