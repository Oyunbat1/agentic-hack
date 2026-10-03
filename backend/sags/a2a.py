"""Minimal Agent2Agent (A2A) protocol: agent card + JSON-RPC `message/send`.

Wire format follows the A2A spec (v0.3): the card lives at
`/.well-known/agent-card.json`, requests are JSON-RPC 2.0 with a `Message`
whose `DataPart` carries `{"skill": ..., "input": {...}}`, and the reply is a
`Task` whose artifact holds the structured result. Any A2A client can call it.
"""

import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

A2A_VERSION = "0.3.0"
CARD_PATH = "/.well-known/agent-card.json"

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


class AgentSkill(BaseModel):
    id: str
    name: str
    description: str
    tags: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)


class AgentCard(BaseModel):
    name: str
    description: str
    url: str
    version: str = "0.1.0"
    protocolVersion: str = A2A_VERSION
    preferredTransport: str = "JSONRPC"
    capabilities: dict[str, Any] = Field(default_factory=lambda: {"streaming": False})
    defaultInputModes: list[str] = Field(default_factory=lambda: ["application/json"])
    defaultOutputModes: list[str] = Field(default_factory=lambda: ["application/json"])
    skills: list[AgentSkill] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)  # non-standard extras (e.g. MCP url)


class A2AError(RuntimeError):
    pass


# ---------- server ----------


def a2a_router(card: AgentCard, handlers: dict[str, Handler]) -> APIRouter:
    router = APIRouter()

    @router.get(CARD_PATH)
    async def agent_card() -> dict:
        return card.model_dump()

    @router.post("/")
    async def rpc(request: Request) -> dict:
        body = await request.json()
        rpc_id = body.get("id")
        if body.get("method") != "message/send":
            return _rpc_error(rpc_id, -32601, f"Method not found: {body.get('method')}")
        message = body.get("params", {}).get("message", {})
        data = next((p.get("data") for p in message.get("parts", []) if p.get("kind") == "data"), None)
        if not data or data.get("skill") not in handlers:
            return _rpc_error(rpc_id, -32602, f"Unknown skill; available: {list(handlers)}")

        task_id, context_id = str(uuid.uuid4()), message.get("contextId") or str(uuid.uuid4())
        try:
            result = await handlers[data["skill"]](data.get("input") or {})
            status = {"state": "completed"}
            artifacts = [{"artifactId": str(uuid.uuid4()), "name": data["skill"], "parts": [{"kind": "data", "data": result}]}]
        except Exception as exc:  # surface agent failures as a failed task, not a transport error
            status = {"state": "failed", "message": _text_message(str(exc), context_id)}
            artifacts = []
        return {
            "jsonrpc": "2.0",
            "id": rpc_id,
            "result": {"kind": "task", "id": task_id, "contextId": context_id, "status": status, "artifacts": artifacts},
        }

    return router


def _rpc_error(rpc_id: Any, code: int, msg: str) -> dict:
    return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": code, "message": msg}}


def _text_message(text: str, context_id: str) -> dict:
    return {"kind": "message", "role": "agent", "messageId": str(uuid.uuid4()), "contextId": context_id, "parts": [{"kind": "text", "text": text}]}


# ---------- client ----------


class A2AClient:
    def __init__(self, base_url: str, http: httpx.AsyncClient):
        self.base_url = base_url.rstrip("/")
        self.http = http

    async def card(self) -> AgentCard:
        resp = await self.http.get(self.base_url + CARD_PATH)
        resp.raise_for_status()
        return AgentCard.model_validate(resp.json())

    async def send(self, skill: str, payload: dict[str, Any], timeout: float = 10.0) -> tuple[dict[str, Any], int]:
        """Call a skill; returns (result data, elapsed ms). Raises A2AError on failure."""
        started = time.perf_counter()
        body = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "message/send",
            "params": {
                "message": {
                    "kind": "message",
                    "role": "user",
                    "messageId": str(uuid.uuid4()),
                    "parts": [{"kind": "data", "data": {"skill": skill, "input": payload}}],
                }
            },
        }
        resp = await self.http.post(self.base_url + "/", json=body, timeout=timeout)
        resp.raise_for_status()
        reply = resp.json()
        if "error" in reply:
            raise A2AError(reply["error"]["message"])
        task = reply["result"]
        if task["status"]["state"] != "completed":
            parts = (task["status"].get("message") or {}).get("parts", [])
            raise A2AError(parts[0]["text"] if parts else task["status"]["state"])
        data = task["artifacts"][0]["parts"][0]["data"]
        return data, int((time.perf_counter() - started) * 1000)
