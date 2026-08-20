#!/bin/bash
# Start postgres cluster if not running, then wait
if ! su - postgres -c "pg_isready -h localhost" &>/dev/null; then
  pg_ctlcluster 15 main start
fi
# Keep supervisor happy - tail the log
tail -F /var/log/postgresql/postgresql-15-main.log 2>/dev/null || sleep infinity
