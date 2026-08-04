#!/usr/bin/env bash
set -euo pipefail

# Loadlyx full local environment launcher.
# Starts a project-specific PostgreSQL container, applies migrations, optionally
# seeds the database, and starts the backend and frontend development servers.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_PATH="${1:-$SCRIPT_DIR}"
WORK_BASE="$SCRIPT_DIR/loadlyx_runtime"

say() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

fail() {
  echo "ERROR: $1"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

extract_zip() {
  local zip_file="$1"
  local target_dir="$2"
  mkdir -p "$target_dir"
  if command -v unzip >/dev/null 2>&1; then
    unzip -o "$zip_file" -d "$target_dir" >/dev/null
  elif command -v python >/dev/null 2>&1; then
    python -c 'import os,sys,zipfile; os.makedirs(sys.argv[2],exist_ok=True); zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$zip_file" "$target_dir"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import os,sys,zipfile; os.makedirs(sys.argv[2],exist_ok=True); zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$zip_file" "$target_dir"
  else
    fail "Could not extract ZIP. Install unzip or Python."
  fi
}

find_project_root() {
  local base="$1"
  if [[ -f "$base/backend/package.json" && -f "$base/frontend/package.json" ]]; then
    echo "$base"; return 0
  fi
  local d
  for d in "$base"/* "$base"/*/*; do
    if [[ -d "$d" && -f "$d/backend/package.json" && -f "$d/frontend/package.json" ]]; then
      echo "$d"; return 0
    fi
  done
  return 1
}

stop_existing() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${old_pid:-}" ]]; then
      kill "$old_pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pid_file"
  fi
}

stop_project_node_processes() {
  # PID files can become stale when the launcher is closed or the project is
  # moved. On Windows, stop only Node processes whose command line belongs to
  # this exact Loadlyx project before clearing .next or regenerating Prisma.
  if command -v powershell.exe >/dev/null 2>&1; then
    local windows_root
    windows_root="$(cygpath -w "$PROJECT_ROOT" 2>/dev/null || printf '%s' "$PROJECT_ROOT")"
    LOADLYX_PROJECT_WINDOWS="$windows_root" powershell.exe -NoProfile -Command '
      $projectRoot = $env:LOADLYX_PROJECT_WINDOWS
      Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -and $_.CommandLine.Contains($projectRoot) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    ' >/dev/null 2>&1 || true
  fi
}

start_docker_desktop_if_needed() {
  if docker info >/dev/null 2>&1; then return 0; fi

  say "STARTING DOCKER"
  case "$(uname -s 2>/dev/null || true)" in
    MINGW*|MSYS*|CYGWIN*)
      local docker_desktop="/c/Program Files/Docker/Docker/Docker Desktop.exe"
      [[ -f "$docker_desktop" ]] || fail "Docker Desktop is not installed in its standard Windows location."
      cmd.exe /c start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >/dev/null 2>&1 || true
      ;;
    Darwin*)
      open -a Docker >/dev/null 2>&1 || true
      ;;
    *)
      fail "Docker is installed but its daemon is not running. Start Docker, then run this launcher again."
      ;;
  esac

  echo "Waiting for Docker Desktop..."
  local attempt
  for attempt in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      echo "Docker is ready."
      return 0
    fi
    sleep 2
  done
  fail "Docker Desktop did not become ready within two minutes."
}

set_env_value() {
  local file="$1" key="$2" value="$3" temp_file="$1.tmp"
  awk -v key="$key" -v value="$value" '
    BEGIN { found=0 }
    index($0, key "=")==1 { print key "=" value; found=1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$file" > "$temp_file"
  mv "$temp_file" "$file"
}

say "LOADLYX FULL LOCAL ENVIRONMENT"
need_cmd node
need_cmd npm
need_cmd docker

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
[[ "${NODE_MAJOR:-0}" -ge 18 ]] || fail "Node.js 18+ is required. Current version: $(node -v)"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required. Update Docker Desktop."

mkdir -p "$WORK_BASE"
[[ -e "$INPUT_PATH" ]] || fail "Path does not exist: $INPUT_PATH"

if [[ -f "$INPUT_PATH" && "$INPUT_PATH" == *.zip ]]; then
  say "ZIP FILE DETECTED"
  ZIP_NAME="$(basename "$INPUT_PATH" .zip)"
  EXTRACT_DIR="$WORK_BASE/$ZIP_NAME"
  rm -rf "$EXTRACT_DIR"
  extract_zip "$INPUT_PATH" "$EXTRACT_DIR"
  PROJECT_ROOT="$(find_project_root "$EXTRACT_DIR")" || fail "Could not locate backend/frontend after extracting ZIP."
else
  PROJECT_ROOT="$(find_project_root "$INPUT_PATH")" || fail "Expected backend/package.json and frontend/package.json under: $INPUT_PATH"
fi

BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="$PROJECT_ROOT/logs"
RUN_DIR="$PROJECT_ROOT/runtime"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.local.yml"
DOCKER_ENV="$PROJECT_ROOT/.env.docker.local"
SHARED_ENV_DIR="$HOME/.loadlyx"
SHARED_DOCKER_ENV="$SHARED_ENV_DIR/database.env"
mkdir -p "$LOG_DIR" "$RUN_DIR"

# ZIP and external-folder modes may keep the launcher beside, rather than
# inside, the selected project. Reuse the launcher's Compose definition.
if [[ ! -f "$COMPOSE_FILE" && -f "$SCRIPT_DIR/docker-compose.local.yml" ]]; then
  COMPOSE_FILE="$SCRIPT_DIR/docker-compose.local.yml"
fi
[[ -f "$COMPOSE_FILE" ]] || fail "docker-compose.local.yml was not found beside the launcher or in the project root."

say "PROJECT FOUND"
echo "Project root: $PROJECT_ROOT"
echo "Database:     loadlyx-postgres on localhost:55432"

# Stop only processes previously launched by this Loadlyx project before npm
# touches node_modules. This avoids Windows EPERM file-lock failures.
stop_existing "$RUN_DIR/backend.pid"
stop_existing "$RUN_DIR/frontend.pid"
stop_project_node_processes
sleep 1

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  [[ -f "$BACKEND_DIR/.env.example" ]] && cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env" || touch "$BACKEND_DIR/.env"
fi
if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
  [[ -f "$FRONTEND_DIR/.env.local.example" ]] && cp "$FRONTEND_DIR/.env.local.example" "$FRONTEND_DIR/.env.local" || touch "$FRONTEND_DIR/.env.local"
fi

mkdir -p "$SHARED_ENV_DIR"

# Keep one durable Loadlyx-only credential file outside extracted release
# folders. This prevents a fresh ZIP from generating a new password while
# Docker is still using Loadlyx's persistent database volume.
if [[ -f "$SHARED_DOCKER_ENV" ]]; then
  cp "$SHARED_DOCKER_ENV" "$DOCKER_ENV"
elif [[ -f "$DOCKER_ENV" ]]; then
  cp "$DOCKER_ENV" "$SHARED_DOCKER_ENV"
else
  DB_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  cat > "$DOCKER_ENV" <<EOF
LOADLYX_POSTGRES_USER=loadlyx_user
LOADLYX_POSTGRES_PASSWORD=$DB_PASSWORD
LOADLYX_POSTGRES_DB=loadlyx
LOADLYX_POSTGRES_PORT=55432
EOF
  cp "$DOCKER_ENV" "$SHARED_DOCKER_ENV"
  echo "Created persistent Loadlyx database credentials: $SHARED_DOCKER_ENV"
fi

# Loadlyx owns host port 55432. Blockplay currently owns 5433. Enforce the
# Loadlyx port in both durable and release-local credential files so a copied
# environment file cannot silently route Prisma to Blockplay.
set_env_value "$SHARED_DOCKER_ENV" "LOADLYX_POSTGRES_PORT" "55432"
set_env_value "$DOCKER_ENV" "LOADLYX_POSTGRES_PORT" "55432"
echo "Using Loadlyx database credentials: $SHARED_DOCKER_ENV"

# shellcheck disable=SC1090
set -a; source "$DOCKER_ENV"; set +a
DATABASE_URL="postgresql://${LOADLYX_POSTGRES_USER}:${LOADLYX_POSTGRES_PASSWORD}@localhost:${LOADLYX_POSTGRES_PORT}/${LOADLYX_POSTGRES_DB}?schema=public"
set_env_value "$BACKEND_DIR/.env" "DATABASE_URL" "$DATABASE_URL"
set_env_value "$BACKEND_DIR/.env" "PORT" "4000"
set_env_value "$BACKEND_DIR/.env" "FRONTEND_URL" "http://localhost:3000"
set_env_value "$BACKEND_DIR/.env" "ALLOWED_ORIGINS" "http://localhost:3000"
set_env_value "$FRONTEND_DIR/.env.local" "NEXT_PUBLIC_API_URL" "http://localhost:4000/api"

start_docker_desktop_if_needed

say "STARTING LOADLYX POSTGRESQL"

# Docker Desktop occasionally receives a partial image layer on Windows and
# reports "short read" or "unexpected EOF". A new pull safely resumes/retries
# the content-addressed download without touching database volumes.
PULL_OK=false
for attempt in 1 2 3 4; do
  echo "Downloading PostgreSQL image (attempt $attempt of 4)..."
  if docker compose --project-name loadlyx --env-file "$DOCKER_ENV" -f "$COMPOSE_FILE" pull postgres; then
    PULL_OK=true
    break
  fi
  if [[ "$attempt" -lt 4 ]]; then
    echo "Image download was interrupted. Retrying in $((attempt * 5)) seconds..."
    sleep $((attempt * 5))
  fi
done
[[ "$PULL_OK" == "true" ]] || fail "PostgreSQL image download failed four times. Check the internet connection and Docker Desktop, then rerun the launcher."

docker compose --project-name loadlyx --env-file "$DOCKER_ENV" -f "$COMPOSE_FILE" up -d --no-build postgres

echo "Waiting for Loadlyx PostgreSQL..."
for attempt in $(seq 1 45); do
  DB_STATUS="$(docker inspect --format '{{.State.Health.Status}}' loadlyx-postgres 2>/dev/null || true)"
  [[ "$DB_STATUS" == "healthy" ]] && break
  sleep 2
done
[[ "${DB_STATUS:-}" == "healthy" ]] || {
  docker compose --project-name loadlyx --env-file "$DOCKER_ENV" -f "$COMPOSE_FILE" logs postgres
  fail "Loadlyx PostgreSQL did not become healthy."
}
echo "Loadlyx PostgreSQL is healthy."

# A PostgreSQL health check does not validate the password. Verify a real
# authenticated query before Prisma runs and provide a safe recovery path when
# an older Loadlyx volume was initialized with different credentials.
verify_database_login() {
  docker exec \
    -e "PGPASSWORD=$LOADLYX_POSTGRES_PASSWORD" \
    loadlyx-postgres \
    psql -h 127.0.0.1 -U "$LOADLYX_POSTGRES_USER" -d "$LOADLYX_POSTGRES_DB" \
    -tAc "SELECT 1" >/dev/null 2>&1
}

if ! verify_database_login; then
  say "LOADLYX DATABASE CREDENTIAL MISMATCH"
  echo "Docker found an older Loadlyx database volume whose saved password"
  echo "does not match this launcher's credentials. Blockplay is not involved."
  echo
  echo "To preserve the existing Loadlyx data, close this launcher and restore"
  echo "the earlier Loadlyx database.env or .env.docker.local file."
  echo
  echo "To delete ONLY the local Loadlyx database and create a clean one, type:"
  echo "RESET-LOADLYX"
  echo "This does not delete project files and does not touch Blockplay."
  echo "Press Enter to continue launching without database access."
  read -r -p "Confirmation: " RESET_CONFIRMATION

  if [[ "$RESET_CONFIRMATION" != "RESET-LOADLYX" ]]; then
    echo "WARNING: Continuing without working PostgreSQL authentication."
    echo "The UI will launch, but database-backed API, login, and admin features may fail."
  else
    say "RESETTING ONLY THE LOCAL LOADLYX DATABASE"
    docker compose --project-name loadlyx --env-file "$DOCKER_ENV" -f "$COMPOSE_FILE" down
    docker volume rm loadlyx-postgres-data >/dev/null
    docker compose --project-name loadlyx --env-file "$DOCKER_ENV" -f "$COMPOSE_FILE" up -d --no-build postgres

    echo "Waiting for the clean Loadlyx PostgreSQL database..."
    DB_STATUS=""
    for attempt in $(seq 1 45); do
      DB_STATUS="$(docker inspect --format '{{.State.Health.Status}}' loadlyx-postgres 2>/dev/null || true)"
      [[ "$DB_STATUS" == "healthy" ]] && break
      sleep 2
    done
    if [[ "$DB_STATUS" != "healthy" ]] || ! verify_database_login; then
      echo "WARNING: The recreated database is not ready. Continuing with application startup."
    else
      echo "The clean Loadlyx database is ready."
    fi
  fi
fi

say "INSTALLING DEPENDENCIES"
if ! (cd "$BACKEND_DIR" && npm install) | tee "$LOG_DIR/backend-install.log"; then
  echo "WARNING: Backend dependency installation failed. Continuing with existing dependencies."
fi
if ! (cd "$FRONTEND_DIR" && npm install) | tee "$LOG_DIR/frontend-install.log"; then
  echo "WARNING: Frontend dependency installation failed. Continuing with existing dependencies."
fi

say "PREPARING DATABASE"
if ! (cd "$BACKEND_DIR" && npx prisma generate) | tee "$LOG_DIR/prisma-generate.log"; then
  echo "WARNING: Prisma client generation failed. Continuing with application startup."
fi
if ! (cd "$BACKEND_DIR" && npx prisma migrate deploy) | tee "$LOG_DIR/prisma-migrate.log"; then
  echo "WARNING: Database migration failed. Continuing with application startup."
fi

if [[ -f "$BACKEND_DIR/prisma/seed.js" ]]; then
  say "SEEDING LOCAL DATABASE"
  if ! (cd "$BACKEND_DIR" && node prisma/seed.js) | tee "$LOG_DIR/prisma-seed.log"; then
    echo "WARNING: The optional demo seed failed. The application will still start; see $LOG_DIR/prisma-seed.log"
  fi
fi

# A stale development cache can reference chunks created by a production build.
rm -rf "$FRONTEND_DIR/.next"

say "STARTING BACKEND"
(cd "$BACKEND_DIR" && nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 & echo $! > "$RUN_DIR/backend.pid")

for attempt in $(seq 1 30); do
  if curl -fsS "http://localhost:4000/health" >/dev/null 2>&1 || curl -fsS "http://localhost:4000/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

say "STARTING FRONTEND"
(cd "$FRONTEND_DIR" && nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 & echo $! > "$RUN_DIR/frontend.pid")

for attempt in $(seq 1 45); do
  if curl -fsS "http://localhost:3000/signup" >/dev/null 2>&1; then break; fi
  sleep 1
done

say "STATUS"
echo "PostgreSQL: $(docker inspect --format '{{.State.Health.Status}}' loadlyx-postgres 2>/dev/null || echo unavailable)"
echo "Frontend:   http://localhost:3000"
echo "Backend:    http://localhost:4000"
echo "Admin:      http://localhost:3000/admin/dashboard"
echo
echo "Logs:       $LOG_DIR"
echo "Database data persists in Docker volume: loadlyx-postgres-data"
echo "Blockplay containers, networks, ports, and volumes are not modified."
echo
echo "To stop the application processes, use the saved PIDs in: $RUN_DIR"
echo "To stop only Loadlyx PostgreSQL (without deleting data):"
echo "  docker compose -p loadlyx --env-file \"$DOCKER_ENV\" -f \"$COMPOSE_FILE\" stop postgres"
