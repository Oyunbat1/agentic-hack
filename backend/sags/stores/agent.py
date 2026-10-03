"""One store = one independent agent process speaking two open protocols:

  • A2A  at /  (+ /.well-known/agent-card.json) — how the Shopper agent negotiates with it
  • MCP  at /mcp                               — the same capabilities as tools for any MCP client

Adding a store = adding a backend with the same 5 methods. The Shopper code never changes.
Run: python -m sags.stores.agent <store_id>
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from typing import Protocol

import uvicorn
from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP

from sags.a2a import AgentCard, AgentSkill, a2a_router
from sags.config import STORES, settings
from sags.contracts import Checkout, CheckoutLine, Offer, Order, StoreInfo, StoreQuote, WantedItem


class StoreBackend(Protocol):
    info: StoreInfo

    async def search(self, query: str) -> list[Offer]: ...
    async def quote(self, wanted: list[WantedItem]) -> StoreQuote: ...
    async def create_checkout(self, user_id: str, lines: list[CheckoutLine]) -> Checkout: ...
    async def confirm_order(self, checkout_id: str, payment_ref: str) -> Order: ...


def make_backend(store_id: str) -> StoreBackend:
    if STORES[store_id]["kind"] == "emart":
        from sags.stores.emart import EmartStore

        return EmartStore(store_id)
    from sags.stores.mock import MockStore

    return MockStore(store_id)


SKILLS = [
    AgentSkill(id="get_store_info", name="Store info", description="Name, delivery fee, minimum order, ETA, whether checkout is supported."),
    AgentSkill(id="search_products", name="Search", description="Free-text product search.", examples=['{"query": "сүү"}']),
    AgentSkill(id="quote_basket", name="Quote basket", description="All in-stock offers for a list of wanted products.", tags=["ucp:discovery"]),
    AgentSkill(id="create_checkout", name="Create checkout", description="Reserve a basket and price it with delivery.", tags=["ucp:checkout"]),
    AgentSkill(id="confirm_order", name="Confirm order", description="Turn a paid checkout into an order.", tags=["ucp:order"]),
]


def create_app(store_id: str) -> FastAPI:
    store = make_backend(store_id)
    base_url = settings().store_url(store_id)

    # ----- MCP face -----
    mcp = FastMCP(f"store-{store_id}", instructions=f"{store.info.name} store tools", stateless_http=True, json_response=True)

    @mcp.tool()
    async def get_store_info() -> dict:
        """Store name, delivery fee, minimum order and whether it can take orders."""
        return store.info.model_dump()

    @mcp.tool()
    async def search_products(query: str) -> list[dict]:
        """Search the store catalog (Mongolian or English)."""
        return [o.model_dump() for o in await store.search(query)]

    @mcp.tool()
    async def quote_basket(items: list[dict]) -> dict:
        """items: [{product_id, name_mn, qty}] → in-stock offers per product."""
        return (await store.quote([WantedItem.model_validate(i) for i in items])).model_dump(mode="json")

    @mcp.tool()
    async def create_checkout(user_id: str, lines: list[dict]) -> dict:
        """lines: [{sku, qty}] → checkout with total incl. delivery."""
        return (await store.create_checkout(user_id, [CheckoutLine.model_validate(l) for l in lines])).model_dump(mode="json")

    @mcp.tool()
    async def confirm_order(checkout_id: str, payment_ref: str) -> dict:
        """Confirm a paid checkout."""
        return (await store.confirm_order(checkout_id, payment_ref)).model_dump(mode="json")

    # ----- A2A face (same capabilities) -----
    handlers = {
        "get_store_info": lambda i: get_store_info(),
        "search_products": lambda i: _wrap_list(search_products(i["query"])),
        "quote_basket": lambda i: quote_basket(i["items"]),
        "create_checkout": lambda i: create_checkout(i["user_id"], i["lines"]),
        "confirm_order": lambda i: confirm_order(i["checkout_id"], i["payment_ref"]),
    }
    card = AgentCard(
        name=store.info.name,
        description=f"Store agent for {store.info.name}. Quotes baskets and takes orders on behalf of the store.",
        url=base_url + "/",
        skills=SKILLS if store.info.checkout else SKILLS[:3],
        metadata={"store_id": store_id, "mcp_url": base_url + "/mcp", "checkout": store.info.checkout},
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        warm = asyncio.create_task(store.warm()) if hasattr(store, "warm") else None
        async with mcp.session_manager.run():
            yield
        if warm:
            warm.cancel()

    app = FastAPI(title=f"store-agent:{store_id}", lifespan=lifespan)
    app.include_router(a2a_router(card, handlers))
    app.mount("/", mcp.streamable_http_app())  # serves /mcp; A2A routes above take precedence
    return app


async def _wrap_list(coro) -> dict:
    return {"offers": await coro}


if __name__ == "__main__":
    sid = sys.argv[1]
    uvicorn.run(create_app(sid), host=settings().host, port=STORES[sid]["port"], log_level="warning")
