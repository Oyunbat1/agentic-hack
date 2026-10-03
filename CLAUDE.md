# Сагс — rules for Claude and both teammates

Product spec (Mongolian): `Сагс — хувийн худалдан авалтын агент.md`. Setup and architecture: `README.md`.

## Ownership (avoid two Claude sessions editing the same files)
- **Оюунбат** — `frontend/`, README, demo, pitch.
- **Есүхэй** — `backend/sags/shopper/`, `backend/sags/stores/`, `backend/sags/jev.py`.
- Shared, change only after both agree: `backend/sags/contracts.py` and its TS mirror `frontend/src/lib/api.ts`.

## Architecture rules
- The Shopper reaches stores **only via A2A** (`sags/a2a.py`) and memory **only via MCP** (`memory_client.py`). Never import store or memory internals into `shopper/`.
- Money, budget, stock, min-order and delivery math live in `shopper/optimizer.py`: pure functions with tests. Never ask the LLM or Jev to compute prices.
- The LLM (`shopper/llm.py`) only parses the request and writes the explanation. Keep the `LanguageModel` interface; OyuLLM plugs in there.
- Jev is for semantic judgements with confidence (intent, product matching). Below the threshold → fall back and say so in the step detail.
- Every agent action is a `Step` in `sessions.steps`: that is the UI timeline and the audit trail. New actions must go through `Shopper._step(...)`.
- Payment happens only after `/api/approve` (human) and `/api/confirm`. No auto-pay path.
- Seed data is deterministic; the demo must give the same result every run (`python -m sags.seed`).

## Code style
- Python 3.12+, async everywhere, pydantic models from `contracts.py`, short docstrings that explain *why*.
- Next.js 16 App Router + Tailwind v4; read `frontend/node_modules/next/dist/docs/` before using unfamiliar Next APIs.
- Run `cd backend && .venv/bin/pytest` and `cd frontend && npx tsc --noEmit && npm run lint` before merging.
