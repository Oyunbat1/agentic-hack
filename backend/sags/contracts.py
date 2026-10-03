"""THE team contract. Shopper, store agents, memory and the web UI all speak these shapes.

Change a model here only after both teammates agree — everything else is built on top.
"""

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Catalog / store side ----------


class Offer(BaseModel):
    """One sellable SKU at one store, mapped to a canonical product."""

    store_id: str
    sku: str
    product_id: str | None = None  # canonical product ("avocado"); None if unmatched
    title: str
    brand: str | None = None
    price: int  # ₮ per unit
    unit: str = "ш"
    stock: int = 0
    url: str | None = None
    image: str | None = None
    match_confidence: float | None = None  # set when an agent (Jev) matched a web result


class StoreInfo(BaseModel):
    store_id: str
    name: str
    delivery_fee: int
    min_order: int = 0
    delivery_eta: str = "өнөөдөр"
    checkout: bool = True  # False = comparison-only (live web source)


class WantedItem(BaseModel):
    """What the shopper asks stores to quote."""

    product_id: str
    name_mn: str
    qty: int = 1
    query: str | None = None  # search phrase for web stores
    hint: str | None = None  # disambiguation for matching ("fresh fruit, not oil")


class StoreQuote(BaseModel):
    """Answer of a store agent to `quote_basket`: every in-stock offer per product."""

    store: StoreInfo
    offers: dict[str, list[Offer]] = Field(default_factory=dict)
    missing: list[str] = Field(default_factory=list)
    took_ms: int = 0


class CheckoutLine(BaseModel):
    sku: str
    qty: int


class Checkout(BaseModel):
    checkout_id: str
    store_id: str
    lines: list[dict[str, Any]]
    subtotal: int
    delivery_fee: int
    total: int
    expires_at: datetime


class Order(BaseModel):
    order_id: str
    store_id: str
    checkout_id: str
    status: Literal["confirmed", "failed"]
    total: int


# ---------- Memory side ----------


class DueItem(BaseModel):
    product_id: str
    name_mn: str
    typical_qty: int
    preferred_brand: str | None
    last_price: int | None
    days_since: float
    avg_interval_days: float
    weight: float
    due_score: float  # days_since / avg_interval * weight; >= 0.8 → suggest


# ---------- Shopper side ----------


class ParsedRequest(BaseModel):
    """Output of the language layer (LLM). Numbers only extracted, never computed."""

    budget: int | None = Field(None, description="Budget in MNT, e.g. '150к' -> 150000")
    add: list[str] = Field(default_factory=list, description="Extra product names to buy (Mongolian)")
    remove: list[str] = Field(default_factory=list, description="Product names the user does NOT want")
    use_usual: bool = Field(True, description="Include the user's usual/due items")


class BasketLine(BaseModel):
    product_id: str
    name_mn: str
    qty: int
    reason: Literal["due", "requested"]
    due_score: float | None = None
    offer: Offer | None = None
    line_total: int = 0
    note: str | None = None  # e.g. "дуртай брэнд", "хамгийн хямд"


class StorePlan(BaseModel):
    store_ids: list[str]
    lines: list[BasketLine]
    subtotal: int
    delivery: int
    total: int
    missing: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)  # e.g. below minimum order → not eligible


class Proposal(BaseModel):
    chosen: StorePlan
    alternatives: list[StorePlan]  # single-store plans for the comparison view
    reference: dict[str, int] = Field(default_factory=dict)  # live web prices per product
    dropped: list[BasketLine] = Field(default_factory=list)  # removed to fit budget
    budget: int | None = None
    explanation: str = ""


Protocol = Literal["A2A", "MCP", "Jev", "LLM", "code", "payment"]


class Step(BaseModel):
    """One entry in the agent timeline — what the judges see."""

    phase: Literal["understand", "remember", "discover", "compare", "decide", "explain", "checkout", "pay", "learn"]
    protocol: Protocol
    actor: str  # "shopper", "nogoon", "memory-mcp", ...
    title: str
    detail: dict[str, Any] = Field(default_factory=dict)
    ms: int = 0
    ok: bool = True
    at: datetime = Field(default_factory=now)


SessionStatus = Literal["planning", "proposed", "awaiting_payment", "completed", "failed"]


class Session(BaseModel):
    id: str
    user_id: str
    message: str
    status: SessionStatus = "planning"
    steps: list[Step] = Field(default_factory=list)
    parsed: ParsedRequest | None = None
    quotes: list[StoreQuote] = Field(default_factory=list)
    wanted: list[BasketLine] = Field(default_factory=list)
    proposal: Proposal | None = None
    checkouts: list[Checkout] = Field(default_factory=list)
    invoice: dict[str, Any] | None = None
    orders: list[Order] = Field(default_factory=list)
    error: str | None = None
    created_at: datetime = Field(default_factory=now)
