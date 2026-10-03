"""Reset and seed MongoDB with the deterministic demo. Run: python -m sags.seed"""

import asyncio
from datetime import timedelta

from sags.config import settings
from sags.contracts import now
from sags.db import db
from sags.memory.service import rebuild_profile
from sags.seed.data import HABITS, HISTORY_DAYS, MOCK_STORES, PRODUCTS, offers_for


async def main() -> None:
    d = db()
    user = settings().demo_user_id
    for name in ["users", "products", "offers", "purchases", "profiles", "feedback", "sessions", "checkouts", "orders"]:
        await d[name].drop()

    await d.users.insert_one({"_id": user, "name": "Оюунбат", "default_budget": 150000, "address": "СБД, 1-р хороо"})
    await d.products.insert_many(
        [
            {"_id": pid, "name_mn": name, "aliases": aliases, "category": cat, "unit": unit, "query": query, "hint": hint}
            for pid, name, aliases, cat, unit, _base, _brands, query, hint in PRODUCTS
        ]
    )
    offers = [o for sid in MOCK_STORES for o in offers_for(sid)]
    await d.offers.insert_many(offers)
    price = {(o["store_id"], o["product_id"]): o["price"] for o in offers}

    # Expand habits into dated purchases, grouped by day; store rotates by day.
    today = now().replace(hour=10, minute=0, second=0, microsecond=0)
    by_day: dict[int, list[dict]] = {}
    for pid, (interval, last, qty, brand) in HABITS.items():
        day = last
        while day <= HISTORY_DAYS:
            by_day.setdefault(day, []).append({"product_id": pid, "qty": qty, "brand": brand})
            day += interval
    stores = list(MOCK_STORES)
    purchases = []
    for i, (day, items) in enumerate(sorted(by_day.items(), reverse=True)):
        sid = stores[i % len(stores)]
        for it in items:
            it["unit_price"] = price.get((sid, it["product_id"]), 0)
        total = sum(it["unit_price"] * it["qty"] for it in items)
        purchases.append({"user_id": user, "store_id": sid, "items": items, "total": total, "created_at": today - timedelta(days=day)})
    await d.purchases.insert_many(purchases)

    await d.offers.create_index([("store_id", 1), ("product_id", 1)])
    await d.offers.create_index([("store_id", 1), ("sku", 1)], unique=True)
    await d.purchases.create_index([("user_id", 1), ("created_at", -1)])
    await d.feedback.create_index([("user_id", 1), ("product_id", 1)])

    await rebuild_profile(d, user)
    print(f"Seeded {len(PRODUCTS)} products, {len(offers)} offers in {len(MOCK_STORES)} stores, {len(purchases)} purchases → db '{settings().mongodb_db}'")


if __name__ == "__main__":
    asyncio.run(main())
