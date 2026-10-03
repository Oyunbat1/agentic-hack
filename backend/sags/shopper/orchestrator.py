"""The Shopper agent — a code-driven state machine (plan option B: reliable on stage).

understand (Jev + LLM) → remember (Memory MCP) → discover (A2A cards) → compare (A2A quotes)
→ decide (code) → explain (LLM) ⏸ human approves → checkout (A2A) → pay → confirm (A2A) → learn (MCP)

Every step is appended to `sessions.steps` in MongoDB: the UI timeline and the audit trail.
"""

import asyncio
import time
import uuid
from contextlib import asynccontextmanager

import httpx

from sags import jev
from sags.a2a import A2AClient
from sags.config import STORES, settings
from sags.contracts import BasketLine, Checkout, Order, ParsedRequest, Session, Step, StoreQuote, WantedItem
from sags.db import db
from sags.memory.service import DUE_THRESHOLD
from sags.shopper import payment
from sags.shopper.llm import RuleModel, get_language_model
from sags.shopper.memory_client import MemoryClient
from sags.shopper.optimizer import optimize_basket


class Shopper:
    def __init__(self):
        self.http = httpx.AsyncClient(timeout=10.0)
        self.lm = get_language_model()
        self.rules = RuleModel()
        self.memory = MemoryClient(settings().memory_mcp_url)
        self.stores = {sid: A2AClient(settings().store_url(sid), self.http) for sid in STORES}

    # ---------- session persistence ----------

    async def create(self, user_id: str, message: str) -> Session:
        session = Session(id=uuid.uuid4().hex[:12], user_id=user_id, message=message)
        await self._save(session)
        return session

    async def load(self, session_id: str) -> Session | None:
        doc = await db().sessions.find_one({"_id": session_id})
        return Session.model_validate(doc) if doc else None

    async def _save(self, s: Session) -> None:
        await db().sessions.replace_one({"_id": s.id}, {"_id": s.id, **s.model_dump()}, upsert=True)

    @asynccontextmanager
    async def _step(self, s: Session, phase: str, protocol: str, actor: str, title: str):
        """Time a step, record it (even on failure) and persist so the UI sees it live."""
        step = Step(phase=phase, protocol=protocol, actor=actor, title=title)
        started = time.perf_counter()
        try:
            yield step
        except Exception as exc:
            step.ok, step.detail = False, {**step.detail, "error": str(exc)[:300]}
            raise
        finally:
            step.ms = int((time.perf_counter() - started) * 1000)
            s.steps.append(step)
            await self._save(s)

    # ---------- phase 1: plan ----------

    async def plan(self, session_id: str) -> None:
        s = await self.load(session_id)
        try:
            parsed, intent = await self._understand(s)
            if intent == "not_shopping":
                s.status, s.error = "failed", "Энэ худалдан авалтын хүсэлт биш байна. Жишээ: «Энэ долоо хоногийн сагсаа 150к-д бэлд, өндөг нэм»"
                return await self._save(s)
            wanted, prefs, meta = await self._remember(s, parsed)
            if not wanted:
                s.status, s.error = "failed", "Сагсанд оруулах бараа олдсонгүй."
                return await self._save(s)
            await self._discover(s)
            quotes = await self._compare(s, wanted, meta)
            await self._decide(s, wanted, quotes, parsed.budget, prefs)
            await self._explain(s)
            s.status = "proposed"
        except Exception as exc:
            s.status, s.error = "failed", str(exc)[:300]
        await self._save(s)

    async def _understand(self, s: Session) -> tuple[ParsedRequest, str]:
        async def intent():
            async with self._step(s, "understand", "Jev", "shopper", "Хүсэлтийн төрлийг ангилав") as st:
                choice, conf = await jev.classify_intent(self.http, s.message)
                st.detail = {"intent": choice, "confidence": conf}
                return choice, conf

        async def parse():
            try:
                async with self._step(s, "understand", "LLM", self.lm.name, "Төсөв, нэмэлт барааг задлав") as st:
                    parsed = await self.lm.parse(s.message)
                    st.detail = parsed.model_dump()
                    return parsed
            except Exception:
                async with self._step(s, "understand", "code", "rules", "LLM алдаа → дүрмээр задлав") as st:
                    parsed = await self.rules.parse(s.message)
                    st.detail = parsed.model_dump()
                    return parsed

        results = await asyncio.gather(intent(), parse(), return_exceptions=True)
        parsed = results[1] if isinstance(results[1], ParsedRequest) else await self.rules.parse(s.message)
        choice, conf = results[0] if isinstance(results[0], tuple) else ("weekly_basket", 0.0)
        if choice == "specific_items" and conf >= settings().jev_min_confidence and parsed.add:
            parsed.use_usual = False
        s.parsed = parsed
        return parsed, choice if conf >= 0.8 else "weekly_basket"

    async def _remember(self, s: Session, parsed: ParsedRequest) -> tuple[list[BasketLine], dict, dict]:
        due = []
        if parsed.use_usual:
            async with self._step(s, "remember", "MCP", "memory-mcp", "Дуусах дөхсөн барааг санав") as st:
                all_due = await self.memory.call("get_due_items", user_id=s.user_id)
                due = [d for d in all_due if d["due_score"] >= DUE_THRESHOLD]
                st.detail = {"due": [{"name": d["name_mn"], "score": d["due_score"], "days_since": d["days_since"], "every": d["avg_interval_days"]} for d in due]}

        names = parsed.add + parsed.remove + [d["name_mn"] for d in due]
        async with self._step(s, "remember", "MCP", "memory-mcp", "Барааг каталогтой тааруулав") as st:
            resolved = await self.memory.call("resolve_products", names=names) if names else {}
            unknown = [n for n in parsed.add if not resolved.get(n)]
            st.detail = {"matched": {n: (r or {}).get("name_mn") for n, r in resolved.items()}, "unknown": unknown}

        removed = {resolved[n]["_id"] for n in parsed.remove if resolved.get(n)}
        lines: dict[str, BasketLine] = {}
        for d in due:
            if d["product_id"] not in removed:
                lines[d["product_id"]] = BasketLine(product_id=d["product_id"], name_mn=d["name_mn"], qty=d["typical_qty"], reason="due", due_score=d["due_score"])
        for n in parsed.add:
            r = resolved.get(n)
            if r and r["_id"] not in removed:
                lines[r["_id"]] = BasketLine(product_id=r["_id"], name_mn=r["name_mn"], qty=1, reason="requested")
        s.wanted = list(lines.values())
        meta = {r["_id"]: r for r in resolved.values() if r}  # search query + hint for web matching
        return s.wanted, {d["product_id"]: d["preferred_brand"] for d in due}, meta

    async def _discover(self, s: Session) -> None:
        async with self._step(s, "discover", "A2A", "shopper", "Дэлгүүрийн агентуудыг олов") as st:
            cards = await asyncio.gather(*(c.card() for c in self.stores.values()), return_exceptions=True)
            st.detail = {
                "agents": [
                    {"id": sid, "name": c.name, "skills": [k.id for k in c.skills], "mcp": c.metadata.get("mcp_url")}
                    if not isinstance(c, Exception) else {"id": sid, "error": "offline"}
                    for sid, c in zip(self.stores, cards)
                ]
            }  # fmt: skip

    async def _compare(self, s: Session, wanted: list[BasketLine], meta: dict) -> list[StoreQuote]:
        items = [
            WantedItem(product_id=l.product_id, name_mn=l.name_mn, qty=l.qty, query=meta.get(l.product_id, {}).get("query"), hint=meta.get(l.product_id, {}).get("hint")).model_dump()
            for l in wanted
        ]  # fmt: skip

        async def ask(sid: str) -> StoreQuote | None:
            try:
                async with self._step(s, "compare", "A2A", sid, f"{STORES[sid]['name']}: үнийн санал") as st:
                    data, ms = await self.stores[sid].send("quote_basket", {"items": items}, timeout=12)
                    q = StoreQuote.model_validate(data)
                    st.detail = {"found": len(q.offers), "missing": q.missing, "ms": ms}
                    if not q.store.checkout:
                        st.detail["matches"] = [{"want": pid, "title": o[0].title, "price": o[0].price, "jev_confidence": o[0].match_confidence} for pid, o in q.offers.items()]
                    return q
            except Exception:
                return None  # one store down must not kill the basket

        quotes = [q for q in await asyncio.gather(*(ask(sid) for sid in self.stores)) if q]
        s.quotes = quotes
        return quotes

    async def _decide(self, s: Session, wanted, quotes, budget, prefs) -> None:
        async with self._step(s, "decide", "code", "optimizer", "Хамгийн хямд сагсыг сонгов") as st:
            s.proposal = optimize_basket(wanted, quotes, budget, prefs)
            c = s.proposal.chosen
            st.detail = {"stores": c.store_ids, "total": c.total, "delivery": c.delivery, "dropped": [d.name_mn for d in s.proposal.dropped],
                         "options": {"+".join(a.store_ids) or "—": a.total for a in s.proposal.alternatives}}  # fmt: skip

    async def _explain(self, s: Session) -> None:
        p = s.proposal
        names = {q.store.store_id: q.store.name for q in s.quotes}
        totals = [a.total for a in p.alternatives if not a.missing and not a.warnings]
        facts = {
            "request": s.message,
            "budget": p.budget,
            "chosen": {"stores": [names[x] for x in p.chosen.store_ids], "goods_subtotal": p.chosen.subtotal, "delivery_fee": p.chosen.delivery, "total_incl_delivery": p.chosen.total},
            "alternatives": [{"stores": [names[x] for x in a.store_ids], "total_incl_delivery": a.total, "missing": a.missing, "warnings": a.warnings} for a in p.alternatives],
            "saving_vs_worst": (max(totals) - p.chosen.total) if totals else 0,
            "dropped": [d.name_mn for d in p.dropped],
            "missing": p.chosen.missing,
            "web_reference_prices": p.reference,
        }
        try:
            async with self._step(s, "explain", "LLM", self.lm.name, "Шийдвэрээ тайлбарлав"):
                p.explanation = await self.lm.explain(facts)
        except Exception:
            p.explanation = await self.rules.explain(facts)

    # ---------- phase 2: human approves → checkout → invoice ----------

    async def approve(self, session_id: str, removed: list[str]) -> Session:
        s = await self.load(session_id)
        if s.status != "proposed":
            raise ValueError(f"Session is {s.status}")
        if removed:
            async with self._step(s, "learn", "MCP", "memory-mcp", "Хассан барааг санав") as st:
                for pid in removed:
                    await self.memory.call("record_feedback", user_id=s.user_id, product_id=pid, action="removed")
                st.detail = {"removed": removed}
            s.wanted = [l for l in s.wanted if l.product_id not in removed]
            async with self._step(s, "decide", "code", "optimizer", "Засварын дараа дахин бодов") as st:
                prefs = {l.product_id: (l.offer.brand if l.offer else None) for l in s.proposal.chosen.lines}
                explanation = s.proposal.explanation
                s.proposal = optimize_basket(s.wanted, s.quotes, s.proposal.budget, prefs)
                s.proposal.explanation = explanation
                st.detail = {"stores": s.proposal.chosen.store_ids, "total": s.proposal.chosen.total}

        s.checkouts = []
        for sid in s.proposal.chosen.store_ids:
            lines = [{"sku": l.offer.sku, "qty": l.qty} for l in s.proposal.chosen.lines if l.offer.store_id == sid]
            async with self._step(s, "checkout", "A2A", sid, f"{STORES[sid]['name']}: checkout үүсгэв") as st:
                data, _ = await self.stores[sid].send("create_checkout", {"user_id": s.user_id, "lines": lines})
                co = Checkout.model_validate(data)
                s.checkouts.append(co)
                st.detail = {"checkout_id": co.checkout_id, "total": co.total}

        total = sum(c.total for c in s.checkouts)
        async with self._step(s, "pay", "payment", "qpay-mock", "Нэхэмжлэх (QR) үүсгэв") as st:
            s.invoice = payment.create_invoice(total, s.id)
            st.detail = {"invoice_id": s.invoice["invoice_id"], "amount": total}
        s.status = "awaiting_payment"
        await self._save(s)
        return s

    # ---------- phase 3: paid → orders → memory learns ----------

    async def confirm(self, session_id: str) -> Session:
        s = await self.load(session_id)
        if s.status != "awaiting_payment":
            raise ValueError(f"Session is {s.status}")
        async with self._step(s, "pay", "payment", "qpay-mock", "Төлбөр баталгаажлаа") as st:
            s.invoice = payment.check_payment(s.invoice)
            st.detail = {"status": s.invoice["status"], "payment_ref": s.invoice["payment_ref"]}

        for co in s.checkouts:
            async with self._step(s, "checkout", "A2A", co.store_id, f"{STORES[co.store_id]['name']}: захиалга баталгаажлаа") as st:
                data, _ = await self.stores[co.store_id].send("confirm_order", {"checkout_id": co.checkout_id, "payment_ref": s.invoice["payment_ref"]})
                order = Order.model_validate(data)
                s.orders.append(order)
                st.detail = {"order_id": order.order_id, "total": order.total}

        async with self._step(s, "learn", "MCP", "memory-mcp", "Худалдан авалтыг ой санамжид бичив") as st:
            for co in s.checkouts:
                items = [{"product_id": l["product_id"], "brand": l["brand"], "qty": l["qty"], "unit_price": l["unit_price"]} for l in co.lines]
                order_id = next(o.order_id for o in s.orders if o.checkout_id == co.checkout_id)
                await self.memory.call("record_purchase", user_id=s.user_id, store_id=co.store_id, items=items, total=co.total, order_id=order_id)
            still_due = [d["name_mn"] for d in await self.memory.call("get_due_items", user_id=s.user_id) if d["due_score"] >= DUE_THRESHOLD]
            st.detail = {"orders": [o.order_id for o in s.orders], "due_now": still_due}
        s.status = "completed"
        await self._save(s)
        return s
