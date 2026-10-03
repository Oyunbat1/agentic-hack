"""Live web store agent: searches emartmall.mn in real time (~300ms per query).

Talks to the site's own search backend over HTTP instead of driving a browser,
then asks Jev which result is really the wanted product ("авокадо" returns
avocado *oil* first). Comparison-only: it cannot place orders.
"""

import asyncio
import time

import httpx

from sags import jev
from sags.config import STORES, settings
from sags.contracts import Checkout, CheckoutLine, Offer, Order, StoreInfo, StoreQuote, WantedItem

SEARCH_URL = "https://api.emartmall.mn/mn/api/search/elastic"
IMAGE_BASE = "https://api.emartmall.mn/"
CACHE_TTL = 600


class EmartStore:
    def __init__(self, store_id: str = "emart"):
        self.store_id = store_id
        self.info = StoreInfo(store_id=store_id, name=STORES[store_id]["name"], delivery_fee=0, checkout=False, delivery_eta="—")
        self.http = httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "Mozilla/5.0 (Sags shopping agent)"})
        self._cache: dict[str, tuple[float, list[Offer]]] = {}

    async def search(self, query: str, limit: int = 8) -> list[Offer]:
        hit = self._cache.get(query)
        if hit and time.time() - hit[0] < CACHE_TTL:
            return hit[1]
        body = {
            "catId": 0, "store": None, "custId": 0, "value": query, "attribute": "", "color": "", "brand": "",
            "promotion": "", "minPrice": 0, "maxPrice": 0, "startsWith": 0, "rowCount": limit,
            "orderColumn": "", "highlight": False, "fashion": 0,
        }  # fmt: skip
        resp = await self.http.post(SEARCH_URL, json=body)
        resp.raise_for_status()
        offers = []
        for h in resp.json()["data"]["hits"]["hits"]:
            s = h["_source"]
            if not s.get("isavailable"):
                continue
            offers.append(
                Offer(
                    store_id=self.store_id,
                    sku=str(s.get("skucd")),
                    title=s.get("title") or "",
                    price=int(s.get("currentprice") or s.get("price") or 0),
                    stock=1,
                    image=IMAGE_BASE + s["imgnm"] if s.get("imgnm") else None,
                )
            )
        self._cache[query] = (time.time(), offers)
        return offers

    async def warm(self) -> None:
        """Emart's search is slow on a cold start (~6s); pre-fetch every catalog query at boot."""
        from sags.seed.data import PRODUCTS

        sem = asyncio.Semaphore(4)

        async def one(query: str) -> None:
            async with sem:
                try:
                    await self.search(query)
                except Exception:
                    pass

        await asyncio.gather(*(one(p[7]) for p in PRODUCTS))

    async def quote(self, wanted: list[WantedItem]) -> StoreQuote:
        started = time.perf_counter()
        searches = await asyncio.gather(*(self.search(w.query or w.name_mn) for w in wanted), return_exceptions=True)
        results = {w.product_id: (r if isinstance(r, list) else []) for w, r in zip(wanted, searches)}
        try:
            picks = await jev.pick_matches(self.http, {w.product_id: (w.name_mn, w.hint, [o.title for o in results[w.product_id]]) for w in wanted})
        except jev.JevUnavailable:
            picks = {pid: (0 if r else None, 0.5) for pid, r in results.items()}  # no decision model: trust site ranking
        offers = {}
        for pid, (idx, conf) in picks.items():
            if idx is not None and idx < len(results[pid]) and conf >= settings().jev_match_threshold:
                offers[pid] = [results[pid][idx].model_copy(update={"product_id": pid, "match_confidence": conf})]
        return StoreQuote(
            store=self.info,
            offers=offers,
            missing=[w.product_id for w in wanted if w.product_id not in offers],
            took_ms=int((time.perf_counter() - started) * 1000),
        )

    async def create_checkout(self, user_id: str, lines: list[CheckoutLine]) -> Checkout:
        raise ValueError("Emart агент зөвхөн үнэ харьцуулна; захиалга хийх эрхгүй")

    async def confirm_order(self, checkout_id: str, payment_ref: str) -> Order:
        raise ValueError("Emart агент зөвхөн үнэ харьцуулна; захиалга хийх эрхгүй")
