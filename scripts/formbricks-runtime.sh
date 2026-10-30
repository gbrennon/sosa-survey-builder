select_formbricks_runtime() {
  if command -v podman >/dev/null 2>&1 \
    && command -v podman-compose >/dev/null 2>&1 \
    && podman --version >/dev/null 2>&1 \
    && podman-compose --version >/dev/null 2>&1; then
    container_runtime="Podman"
    container_cli="podman"
    compose_cmd=(podman-compose)
  elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    container_runtime="Docker Compose"
    container_cli="docker"
    compose_cmd=(docker compose)
  elif command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    container_runtime="Docker Compose (legacy)"
    container_cli="docker"
    compose_cmd=(docker-compose)
  else
    printf 'Podman with podman-compose or Docker with Compose is required\n' >&2
    exit 1
  fi
}

formbricks_compose() {
  "${compose_cmd[@]}" \
    -p "$compose_project" \
    -f "$compose_file" \
    --env-file "$env_file" \
    "$@"
}
