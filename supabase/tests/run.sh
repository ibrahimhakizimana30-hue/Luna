#!/usr/bin/env bash
# Teste les règles de la base Luna sur un PostgreSQL local (16+).
# Usage : PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
psql -q -c "drop database if exists luna_test" -c "create database luna_test"
psql -d luna_test -v ON_ERROR_STOP=1 -q -f supabase_stubs.sql \
  -f ../migrations/0001_luna_init.sql -f ../migrations/0002_luna_storage.sql \
  -f ../migrations/0003_luna_hardening.sql \
  -f ../migrations/0004_luna_admin_messages.sql
psql -d luna_test -v ON_ERROR_STOP=1 -q -f luna_rules_test.sql -f luna_admin_messages_test.sql 2>&1 | sed -n 's/.*NOTICE:  //p'
psql -q -c "drop database luna_test"
