"""The agent's memory, backed by MongoDB.

purchases (raw history) --aggregation--> profiles (habits) --due score--> suggestions
feedback (user edits) lowers a product's weight so the agent learns.
"""

from datetime import datetime
from statistics import median
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from sags.contracts import DueItem, now

DUE_THRESHOLD = 0.8
DEFAULT_INTERVAL_DAYS = 30.0
REMOVAL_DECAY = 0.6  # each "removed" since the last purchase multiplies weight by this


def due_score(days_since: float, avg_interval: float, weight: float) -> float:
    return round(days_since / max(avg_interval, 1.0) * weight, 2)


def habit_from_history(dates: list[datetime], qtys: list[int]) -> tuple[float, int]:
    """(average interval in days, typical quantity) from one product's purchase dates."""
    dates = sorted(dates)
    gaps = [(b - a).total_seconds() / 86400 for a, b in zip(dates, dates[1:])]
    avg = sum(gaps) / len(gaps) if gaps else DEFAULT_INTERVAL_DAYS
    return round(avg, 1), int(median(qtys)) if qtys else 1


async def rebuild_profile(db: AsyncDatabase, user_id: str) -> dict[str, Any]:
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$unwind": "$items"},
        {"$sort": {"created_at": 1}},
        {
            "$group": {
                "_id": "$items.product_id",
                "dates": {"$push": "$created_at"},
                "qtys": {"$push": "$items.qty"},
                "brands": {"$push": "$items.brand"},
                "last_price": {"$last": "$items.unit_price"},
                "last_at": {"$last": "$created_at"},
            }
        },
    ]
    items = []
    async for row in await db.purchases.aggregate(pipeline):
        avg, qty = habit_from_history(row["dates"], row["qtys"])
        brands = [b for b in row["brands"] if b]
        removals = await db.feedback.count_documents(
            {"user_id": user_id, "product_id": row["_id"], "action": "removed", "at": {"$gt": row["last_at"]}}
        )
        items.append(
            {
                "product_id": row["_id"],
                "avg_interval_days": avg,
                "typical_qty": qty,
                "preferred_brand": max(set(brands), key=brands.count) if brands else None,
                "last_price": row["last_price"],
                "last_bought_at": row["last_at"],
                "purchases": len(row["dates"]),
                "weight": round(max(0.2, REMOVAL_DECAY**removals), 2),
            }
        )
    profile = {"_id": user_id, "items": items, "updated_at": now()}
    await db.profiles.replace_one({"_id": user_id}, profile, upsert=True)
    return profile


async def get_due_items(db: AsyncDatabase, user_id: str, at: datetime | None = None) -> list[DueItem]:
    at = at or now()
    profile = await db.profiles.find_one({"_id": user_id}) or await rebuild_profile(db, user_id)
    names = {p["_id"]: p["name_mn"] async for p in db.products.find({}, {"name_mn": 1})}
    out = []
    for it in profile["items"]:
        if it["purchases"] < 2:
            continue  # one purchase is not a habit
        days = (at - it["last_bought_at"]).total_seconds() / 86400
        score = due_score(days, it["avg_interval_days"], it["weight"])
        out.append(
            DueItem(
                product_id=it["product_id"],
                name_mn=names.get(it["product_id"], it["product_id"]),
                typical_qty=it["typical_qty"],
                preferred_brand=it["preferred_brand"],
                last_price=it["last_price"],
                days_since=round(days, 1),
                avg_interval_days=it["avg_interval_days"],
                weight=it["weight"],
                due_score=score,
            )
        )
    return sorted(out, key=lambda d: -d.due_score)


async def resolve_products(db: AsyncDatabase, names: list[str]) -> dict[str, dict | None]:
    """Map free-text Mongolian names to canonical products via aliases (longest alias wins)."""
    products = [p async for p in db.products.find({})]
    result: dict[str, dict | None] = {}
    for raw in names:
        text = raw.lower().strip()
        best, best_len = None, 0
        for p in products:
            for alias in p["aliases"] + [p["name_mn"].lower()]:
                if (alias in text or text in alias) and len(alias) > best_len:
                    best, best_len = p, len(alias)
        result[raw] = {k: best[k] for k in ("_id", "name_mn", "unit", "query", "hint")} if best else None
    return result


async def record_feedback(db: AsyncDatabase, user_id: str, product_id: str, action: str) -> None:
    await db.feedback.insert_one({"user_id": user_id, "product_id": product_id, "action": action, "at": now()})
    await rebuild_profile(db, user_id)


async def record_purchase(db: AsyncDatabase, user_id: str, store_id: str, items: list[dict], total: int, order_id: str) -> None:
    await db.purchases.insert_one(
        {"user_id": user_id, "store_id": store_id, "items": items, "total": total, "order_id": order_id, "created_at": now()}
    )
    await rebuild_profile(db, user_id)


async def get_history(db: AsyncDatabase, user_id: str, limit: int = 20) -> list[dict]:
    cursor = db.purchases.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return [p async for p in cursor]
