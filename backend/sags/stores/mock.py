"""A fictional store whose catalog, checkouts and orders live in MongoDB."""

import re
import uuid
from datetime import timedelta

from sags.config import STORES
from sags.contracts import Checkout, CheckoutLine, Offer, Order, StoreInfo, StoreQuote, WantedItem, now
from sags.db import db
from sags.seed.data import MOCK_STORES


class MockStore:
    def __init__(self, store_id: str):
        self.store_id = store_id
        cfg = MOCK_STORES[store_id]
        self.info = StoreInfo(
            store_id=store_id,
            name=STORES[store_id]["name"],
            delivery_fee=cfg["delivery_fee"],
            min_order=cfg["min_order"],
            delivery_eta=cfg["eta"],
        )

    def _offer(self, row: dict) -> Offer:
        return Offer.model_validate({k: v for k, v in row.items() if k != "_id"})

    async def search(self, query: str, limit: int = 20) -> list[Offer]:
        rx = re.compile(re.escape(query), re.IGNORECASE)
        cursor = db().offers.find({"store_id": self.store_id, "$or": [{"title": rx}, {"product_id": rx}]}).limit(limit)
        return [self._offer(r) async for r in cursor]

    async def quote(self, wanted: list[WantedItem]) -> StoreQuote:
        ids = [w.product_id for w in wanted]
        cursor = db().offers.find({"store_id": self.store_id, "product_id": {"$in": ids}, "stock": {"$gt": 0}})
        offers: dict[str, list[Offer]] = {}
        async for row in cursor:
            offers.setdefault(row["product_id"], []).append(self._offer(row))
        return StoreQuote(store=self.info, offers=offers, missing=[i for i in ids if i not in offers])

    async def create_checkout(self, user_id: str, lines: list[CheckoutLine]) -> Checkout:
        out, subtotal = [], 0
        for line in lines:
            row = await db().offers.find_one({"store_id": self.store_id, "sku": line.sku})
            if not row or row["stock"] < line.qty:
                raise ValueError(f"{line.sku}: үлдэгдэл хүрэлцэхгүй")
            out.append({"sku": line.sku, "title": row["title"], "qty": line.qty, "unit_price": row["price"], "product_id": row["product_id"], "brand": row["brand"]})
            subtotal += row["price"] * line.qty
        if subtotal < self.info.min_order:
            raise ValueError(f"Доод захиалга {self.info.min_order}₮")
        checkout = Checkout(
            checkout_id=f"co_{uuid.uuid4().hex[:10]}",
            store_id=self.store_id,
            lines=out,
            subtotal=subtotal,
            delivery_fee=self.info.delivery_fee,
            total=subtotal + self.info.delivery_fee,
            expires_at=now() + timedelta(minutes=15),
        )
        await db().checkouts.insert_one({**checkout.model_dump(), "_id": checkout.checkout_id, "user_id": user_id, "status": "open"})
        return checkout

    async def confirm_order(self, checkout_id: str, payment_ref: str) -> Order:
        co = await db().checkouts.find_one_and_update(
            {"_id": checkout_id, "store_id": self.store_id, "status": "open"}, {"$set": {"status": "paid", "payment_ref": payment_ref}}
        )
        if not co:
            raise ValueError("Checkout олдсонгүй эсвэл аль хэдийн баталгаажсан")
        for line in co["lines"]:
            await db().offers.update_one({"store_id": self.store_id, "sku": line["sku"]}, {"$inc": {"stock": -line["qty"]}})
        order = Order(order_id=f"ord_{uuid.uuid4().hex[:10]}", store_id=self.store_id, checkout_id=checkout_id, status="confirmed", total=co["total"])
        await db().orders.insert_one({**order.model_dump(), "_id": order.order_id, "user_id": co["user_id"], "created_at": now()})
        return order
