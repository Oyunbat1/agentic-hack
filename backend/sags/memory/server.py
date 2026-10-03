"""Memory MCP server — exposes the MongoDB-backed memory as MCP tools.

The Shopper agent reads/writes memory ONLY through these tools, so any MCP
client (Claude Desktop, MCP Inspector, another team's agent) can use it too.
Run: python -m sags.memory.server   (streamable HTTP at :8100/mcp)
"""

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from sags.config import settings
from sags.db import db
from sags.memory import service

mcp = FastMCP(
    "sags-memory",
    instructions="Long-term shopping memory of a user: habits, due items, history, feedback.",
    host=settings().host,
    port=settings().memory_mcp_port,
    stateless_http=True,
    json_response=True,
)


def _json(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


@mcp.tool()
async def get_due_items(user_id: str) -> list[dict]:
    """Products the user is about to run out of, ranked by due score (days since last buy / usual interval × weight)."""
    return [d.model_dump() for d in await service.get_due_items(db(), user_id)]


@mcp.tool()
async def resolve_products(names: list[str]) -> dict:
    """Map free-text product names (Mongolian) to canonical catalog products."""
    return _json(await service.resolve_products(db(), names))


@mcp.tool()
async def get_profile(user_id: str) -> dict:
    """The user's learned habits per product (interval, typical qty, preferred brand, weight)."""
    profile = await db().profiles.find_one({"_id": user_id}) or await service.rebuild_profile(db(), user_id)
    return _json(profile)


@mcp.tool()
async def get_history(user_id: str, limit: int = 20) -> list[dict]:
    """Most recent purchases, newest first."""
    return _json(await service.get_history(db(), user_id, limit))


@mcp.tool()
async def record_feedback(user_id: str, product_id: str, action: str) -> dict:
    """Store a user edit: action is 'removed', 'added' or 'substituted'. Recomputes the profile."""
    await service.record_feedback(db(), user_id, product_id, action)
    return {"ok": True}


@mcp.tool()
async def record_purchase(user_id: str, store_id: str, items: list[dict], total: int, order_id: str) -> dict:
    """Append a completed order to history (items: product_id, brand, qty, unit_price). Recomputes the profile."""
    await service.record_purchase(db(), user_id, store_id, items, total, order_id)
    return {"ok": True}


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
