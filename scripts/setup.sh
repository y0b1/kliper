#!/usr/bin/env bash
# One-time local setup for Kliper on macOS, then starts the dev server.
# Safe to rerun: it skips steps that are already done.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1;33m▸ %s\033[0m\n" "$1"; }

say "Checking Node"
if ! command -v node >/dev/null; then
  echo "Node isn't installed. With nvm: nvm install 22 && nvm use 22, then rerun this script."
  exit 1
fi
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || {
  echo "Kliper needs Node 20 or newer (you have $(node -v)). Try: nvm install 22 && nvm use 22"
  exit 1
}

say "Checking pnpm"
if ! command -v pnpm >/dev/null; then
  corepack enable pnpm 2>/dev/null || npm install -g pnpm
fi

say "Checking PostgreSQL"
if ! command -v psql >/dev/null; then
  if [ -d "/Applications/Postgres.app" ]; then
    export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
  elif command -v brew >/dev/null; then
    echo "Installing PostgreSQL 16 with Homebrew…"
    brew install postgresql@16
    export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
  else
    echo "PostgreSQL isn't installed. Get Postgres.app from https://postgresapp.com, open it, then rerun this script."
    exit 1
  fi
fi

if ! pg_isready -q 2>/dev/null; then
  if command -v brew >/dev/null && brew list postgresql@16 >/dev/null 2>&1; then
    brew services start postgresql@16
  else
    echo "Postgres isn't running. Open Postgres.app (or start your Postgres server), then rerun this script."
    exit 1
  fi
  for _ in 1 2 3 4 5 6 7 8 9 10; do pg_isready -q && break; sleep 1; done
fi

say "Creating the kliper database"
createdb kliper 2>/dev/null && echo "Created." || echo "Already exists."

if [ ! -f .env ]; then
  echo "DATABASE_URL=\"postgresql://$(whoami)@localhost:5432/kliper?schema=public\"" > .env
  echo "Wrote .env for user $(whoami)."
fi

say "Installing packages"
pnpm install

say "Applying migrations"
pnpm db:deploy

say "Loading sample Davao data"
pnpm db:seed

say "Starting Kliper at http://localhost:3000"
pnpm dev
