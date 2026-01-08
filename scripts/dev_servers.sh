#!/usr/bin/env bash
set -Eeuo pipefail
set -m  # enable job control so bash creates process groups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - INT TERM EXIT

  [[ -n "${BACKEND_PID}" ]] && kill -TERM -- -"${BACKEND_PID}" 2>/dev/null || true
  [[ -n "${FRONTEND_PID}" ]] && kill -TERM -- -"${FRONTEND_PID}" 2>/dev/null || true

  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

(
  cd "${ROOT_DIR}/backend"
  uv run python -m applique_backend.app --log-config logging.yml --reload
) &
BACKEND_PID=$!

(
  cd "${ROOT_DIR}/frontend"
  bun run dev
) &
FRONTEND_PID=$!

# If either dies, shut everything down
while true; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then break; fi
  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then break; fi
  sleep 0.5
done

cleanup
