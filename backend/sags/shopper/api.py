"""Web API between the Next.js UI and the Shopper agent.

POST /api/plan     {user_id?, message}   → {session_id}  (agent runs in background; poll the session)
GET  /api/session/{id}                   → full session: status, live timeline, proposal
POST /api/approve  {session_id, removed} → checkouts + QR invoice   (human-in-the-loop gate)
POST /api/confirm  {session_id}          → orders + memory updated
GET  /api/memory/{user_id}               → profile, due items, history (the "memory" panel)
GET  /api/agents                         → A2A agent cards of all stores
"""

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sags.config import settings
from sags.shopper.orchestrator import Shopper

app = FastAPI(title="Sags Shopper Agent")
app.add_middleware(CORSMiddleware, allow_origins=[settings().frontend_origin], allow_methods=["*"], allow_headers=["*"])
shopper = Shopper()
_tasks: set[asyncio.Task] = set()


class PlanIn(BaseModel):
    message: str
    user_id: str | None = None


class ApproveIn(BaseModel):
    session_id: str
    removed: list[str] = []


class ConfirmIn(BaseModel):
    session_id: str


@app.post("/api/plan")
async def plan(body: PlanIn) -> dict:
    session = await shopper.create(body.user_id or settings().demo_user_id, body.message)
    task = asyncio.create_task(shopper.plan(session.id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"session_id": session.id}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str) -> dict:
    s = await shopper.load(session_id)
    if not s:
        raise HTTPException(404, "session not found")
    return s.model_dump(mode="json")


@app.post("/api/approve")
async def approve(body: ApproveIn) -> dict:
    try:
        return (await shopper.approve(body.session_id, body.removed)).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(409, str(exc))


@app.post("/api/confirm")
async def confirm(body: ConfirmIn) -> dict:
    try:
        return (await shopper.confirm(body.session_id)).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(409, str(exc))


@app.get("/api/memory/{user_id}")
async def memory(user_id: str) -> dict:
    due, profile, history = await asyncio.gather(
        shopper.memory.call("get_due_items", user_id=user_id),
        shopper.memory.call("get_profile", user_id=user_id),
        shopper.memory.call("get_history", user_id=user_id, limit=12),
    )
    return {"due": due, "profile": profile, "history": history}


@app.get("/api/agents")
async def agents() -> list[dict]:
    cards = await asyncio.gather(*(c.card() for c in shopper.stores.values()), return_exceptions=True)
    return [{"id": sid, "online": not isinstance(c, Exception), **({} if isinstance(c, Exception) else c.model_dump())} for sid, c in zip(shopper.stores, cards)]


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "llm": shopper.lm.name, "jev": bool(settings().typesafe_api_key)}
