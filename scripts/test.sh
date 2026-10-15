#!/usr/bin/env bash
set -euo pipefail
(cd backend && python -m pytest -q)
(cd frontend && npm run test -- --run)
(cd frontend && npm run typecheck)
