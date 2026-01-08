#! /usr/bin/env bash
set -e
set -x

python3 -m applique_backend.prestart || { echo "Prestart failed"; exit 1; }
alembic upgrade head
exec uvicorn applique_backend.app:build_app --factory --host 0.0.0.0 --port 8000
