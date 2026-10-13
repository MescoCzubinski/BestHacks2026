#!/bin/sh
# Login roles for the services. Passwords come from the db container's environment, never from git.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v backend_password="$BACKEND_DB_PASSWORD" \
  -v fetcher_password="$FETCHER_DB_PASSWORD" <<'SQL'
CREATE ROLE backend_ro LOGIN PASSWORD :'backend_password';
CREATE ROLE fetcher_rw LOGIN PASSWORD :'fetcher_password';
SQL
