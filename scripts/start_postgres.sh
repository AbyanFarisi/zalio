#!/bin/bash
# Self-healing PostgreSQL bootstrap for Zalio ERP.
# The container only persists /app; system packages (incl. PostgreSQL) are wiped on
# every restart. This script reinstalls + initializes + seeds PostgreSQL automatically
# so the prebuilt Go service binaries (which DO persist in /app) can connect.
set -uo pipefail

PG_VER=15
DSN_USER=zalio
DSN_PASS=zalio123
DSN_DB=zalio
INIT_SQL=/app/db/init.sql

log(){ echo "[start_postgres] $*"; }

# 1. Ensure PostgreSQL is installed
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  log "PostgreSQL not found, installing..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >/tmp/pg_install.log 2>&1
  apt-get install -y postgresql-${PG_VER} postgresql-client-${PG_VER} >>/tmp/pg_install.log 2>&1
  log "install finished (exit $?)"
fi

# 2. Ensure a cluster exists
if ! pg_lsclusters 2>/dev/null | grep -q "^${PG_VER}[[:space:]]*main"; then
  log "creating cluster ${PG_VER}/main"
  pg_createcluster ${PG_VER} main >/tmp/pg_cluster.log 2>&1
fi

# 3. Start the cluster
pg_ctlcluster ${PG_VER} main start 2>/tmp/pg_start.log
for i in $(seq 1 30); do
  if pg_isready -h localhost >/dev/null 2>&1; then break; fi
  sleep 1
done

# 4. Ensure role + database exist, then run idempotent schema/seed
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DSN_USER}'\" | grep -q 1" \
  || su - postgres -c "psql -c \"CREATE USER ${DSN_USER} WITH PASSWORD '${DSN_PASS}' SUPERUSER;\""
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DSN_DB}'\" | grep -q 1" \
  || su - postgres -c "psql -c \"CREATE DATABASE ${DSN_DB} OWNER ${DSN_USER};\""

if [ -f "${INIT_SQL}" ]; then
  log "applying schema/seed (idempotent)"
  PGPASSWORD=${DSN_PASS} psql -h localhost -U ${DSN_USER} -d ${DSN_DB} -f "${INIT_SQL}" >/tmp/pg_seed.log 2>&1
fi

log "PostgreSQL ready on localhost:5432"

# 5. Keep supervisor happy
tail -F /var/log/postgresql/postgresql-${PG_VER}-main.log 2>/dev/null || sleep infinity
