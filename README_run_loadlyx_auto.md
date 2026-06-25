# Loadlyx Full Automatic Setup Script

This package includes a **fully automatic setup script** for your Loadlyx app.

## Files
- `run_loadlyx_auto.sh` → main setup + launcher script
- `README_run_loadlyx_auto.md` → this guide

## What the script does
The script will:

1. accept either:
   - a **ZIP file path**
   - or an **already extracted project folder**
2. extract the ZIP automatically if needed
3. detect the real Loadlyx project root, including nested folders
4. verify `backend/` and `frontend/` exist
5. create:
   - `logs/`
   - `runtime/`
   - `.env` if missing
   - `.env.local` if missing
6. install backend and frontend dependencies
7. generate Prisma client
8. try to run Prisma migrations
9. try to seed the database
10. start backend and frontend automatically

---

## Apps you need installed first

### Required
- **Node.js 18 or newer**
- **npm** (comes with Node.js)
- **Git Bash** on Windows

### Optional but useful
- PostgreSQL, if you want a real local DB
- Stripe CLI, if you want webhook forwarding

---

## How to use it

### Option 1: Run it from the same folder as the ZIP
If your ZIP is in the same folder as the script:

```bash
bash run_loadlyx_auto.sh "/c/Users/YourName/Downloads/loadlyx_phase1_5_dark_ui.zip"
```

### Option 2: Run it against an extracted project folder

```bash
bash run_loadlyx_auto.sh "/c/Users/YourName/Downloads/loadlyx_phase1_5_dark_ui"
```

### Option 3: Put the script inside the extracted project folder and run with no argument

```bash
bash run_loadlyx_auto.sh
```

---

## What happens after it runs

If successful, it should print:

- frontend URL
- backend URL
- admin URL
- log file locations
- process IDs

Typical URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Admin: `http://localhost:3000/admin/dashboard`

---

## Important notes

### 1. ZIP inside ZIP / nested folder issue
This script automatically checks for nested folders like:

```text
loadlyx_phase1_5_dark_ui/
  loadlyx_phase1_5_dark_ui/
    backend/
    frontend/
```

So you do **not** need to manually fix that.

### 2. .env files
If `.env` and `.env.local` are missing, the script creates them.

You should still open them afterward and replace placeholder values for:
- database
- Stripe keys

### 3. Database
The script tries to run Prisma migrations automatically.

If your database is not ready yet, the app may still install successfully, but migration/seed may fail. That is okay — check the logs.

### 4. Logs
All logs are saved inside:

```text
logs/
```

Examples:
- `logs/backend-install.log`
- `logs/frontend-install.log`
- `logs/backend.log`
- `logs/frontend.log`
- `logs/prisma-migrate.log`

---

## How to stop the app

The script saves process IDs inside:

```text
runtime/
```

To stop the app:

```bash
kill $(cat runtime/backend.pid)
kill $(cat runtime/frontend.pid)
```

---

## Common problems

### “node: command not found”
Install Node.js 18+.

### “npm install” fails
Usually:
- no internet
- corporate firewall
- npm blocked
- bad package registry config

### “Prisma migrate failed”
Usually:
- database not running
- bad `DATABASE_URL`
- PostgreSQL not installed yet

### “Port already in use”
Another app is already using:
- `3000`
- `4000`

Stop the old process or edit your ports.

---

## Best practice after first run

After the first automatic setup:

1. confirm homepage loads
2. confirm store page works
3. confirm load board works
4. confirm admin dashboard opens
5. test quote form
6. test checkout

---

## Recommended first command
Most likely you will use:

```bash
bash run_loadlyx_auto.sh "/c/Users/YourName/Downloads/loadlyx_phase1_5_dark_ui.zip"
```
