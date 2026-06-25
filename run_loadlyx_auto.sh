#!/usr/bin/env bash
set -euo pipefail

# Loadlyx Full Automatic Setup Script
# Works in Git Bash on Windows, and also macOS/Linux shells.
#
# What it does:
# 1. Accepts either a ZIP file path or extracted project folder path
# 2. Extracts ZIP automatically if needed
# 3. Detects/fixes nested project folder structure
# 4. Verifies backend/frontend structure
# 5. Creates logs/, runtime/, .env, and .env.local if missing
# 6. Installs backend/frontend dependencies
# 7. Generates Prisma client
# 8. Optionally runs prisma migrate dev if DATABASE_URL is configured
# 9. Starts backend and frontend in background
# 10. Saves PIDs and logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_PATH="${1:-$SCRIPT_DIR}"
WORK_BASE="$SCRIPT_DIR/loadlyx_runtime"

mkdir -p "$WORK_BASE"

say() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1"
    exit 1
  fi
}

need_cmd node
need_cmd npm

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  echo "ERROR: Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

extract_zip() {
  local zip_file="$1"
  local target_dir="$2"

  mkdir -p "$target_dir"

  if command -v unzip >/dev/null 2>&1; then
    unzip -o "$zip_file" -d "$target_dir" >/dev/null
  elif command -v python >/dev/null 2>&1; then
    python - <<PY
import zipfile, sys, os
zip_path = r"""$zip_file"""
target = r"""$target_dir"""
os.makedirs(target, exist_ok=True)
with zipfile.ZipFile(zip_path, "r") as zf:
    zf.extractall(target)
print("Extracted", zip_path, "to", target)
PY
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<PY
import zipfile, sys, os
zip_path = r"""$zip_file"""
target = r"""$target_dir"""
os.makedirs(target, exist_ok=True)
with zipfile.ZipFile(zip_path, "r") as zf:
    zf.extractall(target)
print("Extracted", zip_path, "to", target)
PY
  else
    echo "ERROR: Could not extract ZIP. Install unzip or Python."
    exit 1
  fi
}

find_project_root() {
  local base="$1"

  if [[ -f "$base/backend/package.json" && -f "$base/frontend/package.json" ]]; then
    echo "$base"
    return 0
  fi

  for d in "$base"/*; do
    if [[ -d "$d" && -f "$d/backend/package.json" && -f "$d/frontend/package.json" ]]; then
      echo "$d"
      return 0
    fi
  done

  for d in "$base"/*/*; do
    if [[ -d "$d" && -f "$d/backend/package.json" && -f "$d/frontend/package.json" ]]; then
      echo "$d"
      return 0
    fi
  done

  return 1
}

say "LOADLYX FULL AUTOMATIC SETUP"

if [[ ! -e "$INPUT_PATH" ]]; then
  echo "ERROR: Path does not exist: $INPUT_PATH"
  exit 1
fi

PROJECT_ROOT=""
if [[ -f "$INPUT_PATH" && "$INPUT_PATH" == *.zip ]]; then
  say "ZIP FILE DETECTED"
  ZIP_NAME="$(basename "$INPUT_PATH" .zip)"
  EXTRACT_DIR="$WORK_BASE/$ZIP_NAME"
  rm -rf "$EXTRACT_DIR"
  extract_zip "$INPUT_PATH" "$EXTRACT_DIR"
  PROJECT_ROOT="$(find_project_root "$EXTRACT_DIR")" || {
    echo "ERROR: Could not locate backend/frontend after extracting ZIP."
    exit 1
  }
else
  PROJECT_ROOT="$(find_project_root "$INPUT_PATH")" || {
    echo "ERROR: Could not find a valid Loadlyx project in: $INPUT_PATH"
    echo "Expected backend/package.json and frontend/package.json"
    exit 1
  }
fi

BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="$PROJECT_ROOT/logs"
RUN_DIR="$PROJECT_ROOT/runtime"

mkdir -p "$LOG_DIR" "$RUN_DIR"

say "PROJECT FOUND"
echo "Project root: $PROJECT_ROOT"
echo "Backend:      $BACKEND_DIR"
echo "Frontend:     $FRONTEND_DIR"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  say "CREATING BACKEND .env"
  if [[ -f "$BACKEND_DIR/.env.example" ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  else
    cat > "$BACKEND_DIR/.env" <<'EOF'
DATABASE_URL=file:./dev.db
PORT=4000
FRONTEND_URL=http://localhost:3000
DEFAULT_TENANT_SLUG=demo
DEFAULT_TENANT_NAME=Loadlyx Demo
TRUST_PROXY=false
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_CURRENCY=cad
EOF
  fi
  echo "Created: $BACKEND_DIR/.env"
fi

if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
  say "CREATING FRONTEND .env.local"
  if [[ -f "$FRONTEND_DIR/.env.local.example" ]]; then
    cp "$FRONTEND_DIR/.env.local.example" "$FRONTEND_DIR/.env.local"
  else
    cat > "$FRONTEND_DIR/.env.local" <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
EOF
  fi
  echo "Created: $FRONTEND_DIR/.env.local"
fi

say "INSTALLING BACKEND DEPENDENCIES"
(
  cd "$BACKEND_DIR"
  npm install
) | tee "$LOG_DIR/backend-install.log"

say "INSTALLING FRONTEND DEPENDENCIES"
(
  cd "$FRONTEND_DIR"
  npm install
) | tee "$LOG_DIR/frontend-install.log"

if [[ -f "$BACKEND_DIR/prisma/schema.prisma" ]]; then
  say "GENERATING PRISMA CLIENT"
  (
    cd "$BACKEND_DIR"
    npx prisma generate
  ) | tee "$LOG_DIR/prisma-generate.log"

  if grep -q '^DATABASE_URL=' "$BACKEND_DIR/.env"; then
    if grep -Eqi 'postgresql|mysql|sqlite|file:' "$BACKEND_DIR/.env"; then
      say "TRYING DATABASE MIGRATION"
      set +e
      (
        cd "$BACKEND_DIR"
        npx prisma migrate dev --name init
      ) | tee "$LOG_DIR/prisma-migrate.log"
      MIGRATE_EXIT=$?
      set -e
      if [[ $MIGRATE_EXIT -ne 0 ]]; then
        echo "WARNING: Prisma migrate did not complete. Check $LOG_DIR/prisma-migrate.log"
      fi

      if [[ -f "$BACKEND_DIR/prisma/seed.js" ]]; then
        say "TRYING DATABASE SEED"
        set +e
        (
          cd "$BACKEND_DIR"
          node prisma/seed.js
        ) | tee "$LOG_DIR/prisma-seed.log"
        SEED_EXIT=$?
        set -e
        if [[ $SEED_EXIT -ne 0 ]]; then
          echo "WARNING: Seed did not complete. Check $LOG_DIR/prisma-seed.log"
        fi
      fi
    fi
  fi
fi

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

stop_existing "$RUN_DIR/backend.pid"
stop_existing "$RUN_DIR/frontend.pid"

say "STARTING BACKEND"
(
  cd "$BACKEND_DIR"
  nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$RUN_DIR/backend.pid"
)

sleep 5

say "STARTING FRONTEND"
(
  cd "$FRONTEND_DIR"
  nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$RUN_DIR/frontend.pid"
)

sleep 8

say "STATUS"
BACKEND_PID="$(cat "$RUN_DIR/backend.pid" 2>/dev/null || true)"
FRONTEND_PID="$(cat "$RUN_DIR/frontend.pid" 2>/dev/null || true)"

if [[ -n "${BACKEND_PID:-}" ]] && ps -p "$BACKEND_PID" >/dev/null 2>&1; then
  echo "Backend running (PID $BACKEND_PID)"
else
  echo "Backend may not have started correctly. Check: $LOG_DIR/backend.log"
fi

if [[ -n "${FRONTEND_PID:-}" ]] && ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Frontend running (PID $FRONTEND_PID)"
else
  echo "Frontend may not have started correctly. Check: $LOG_DIR/frontend.log"
fi

echo
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "Admin:    http://localhost:3000/admin/dashboard"
echo
echo "Logs:"
echo "  $LOG_DIR/backend.log"
echo "  $LOG_DIR/frontend.log"
echo
echo "To stop:"
echo "  kill $(cat "$RUN_DIR/backend.pid" 2>/dev/null || echo BACKEND_PID)"
echo "  kill $(cat "$RUN_DIR/frontend.pid" 2>/dev/null || echo FRONTEND_PID)"
