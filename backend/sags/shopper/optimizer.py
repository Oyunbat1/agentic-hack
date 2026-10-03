"""Basket decision rules — plain code, never the LLM. Deterministic and unit-tested.

Rules (from the plan):
  hard   never exceed the budget → drop the least-due items first, say why
  hard   never pick out-of-stock offers
  goal   minimum total incl. delivery; compare single-store vs split baskets
  penalty every extra store adds its delivery fee; split only if it saves >= SPLIT_MIN_SAVING
  soft   preferred brand wins if it costs <= 15% more than the cheapest
  hard   below a store's minimum order → that plan is not eligible
"""

from itertools import combinations

from sags.contracts import BasketLine, Offer, Proposal, StorePlan, StoreQuote

BRAND_TOLERANCE = 0.15
SPLIT_MIN_SAVING = 3000


def _pick(line: BasketLine, candidates: list[Offer], preferred: str | None) -> tuple[Offer, str] | None:
    candidates = [o for o in candidates if o.stock >= line.qty]
    if not candidates:
        return None
    cheapest = min(candidates, key=lambda o: o.price)
    if preferred:
        fav = [o for o in candidates if o.brand == preferred]
        if fav and min(fav, key=lambda o: o.price).price <= cheapest.price * (1 + BRAND_TOLERANCE):
            return min(fav, key=lambda o: o.price), "дуртай брэнд"
    return cheapest, "хамгийн хямд"


def plan_for(store_ids: tuple[str, ...], lines: list[BasketLine], quotes: dict[str, StoreQuote], prefs: dict[str, str | None]) -> StorePlan:
    chosen, missing = [], []
    for line in lines:
        candidates = [o for sid in store_ids for o in quotes[sid].offers.get(line.product_id, [])]
        pick = _pick(line, candidates, prefs.get(line.product_id))
        if pick is None:
            missing.append(line.product_id)
            continue
        offer, note = pick
        chosen.append(line.model_copy(update={"offer": offer, "line_total": offer.price * line.qty, "note": note}))

    used = sorted({l.offer.store_id for l in chosen})
    delivery = sum(quotes[s].store.delivery_fee for s in used)
    warnings = []
    for s in used:
        sub = sum(l.line_total for l in chosen if l.offer.store_id == s)
        if sub < quotes[s].store.min_order:
            warnings.append(f"{quotes[s].store.name}: доод захиалга {quotes[s].store.min_order:,}₮ хүрэхгүй")
    subtotal = sum(l.line_total for l in chosen)
    return StorePlan(store_ids=used, lines=chosen, subtotal=subtotal, delivery=delivery, total=subtotal + delivery, missing=missing, warnings=warnings)


def _best(lines: list[BasketLine], quotes: dict[str, StoreQuote], prefs: dict[str, str | None]) -> tuple[StorePlan, list[StorePlan]]:
    ids = sorted(quotes)
    singles = [plan_for((s,), lines, quotes, prefs) for s in ids]
    eligible_singles = [p for p in singles if not p.warnings and p.store_ids]
    best_single = min(eligible_singles, key=lambda p: (len(p.missing), p.total), default=None)

    best = best_single
    for pair in combinations(ids, 2):
        p = plan_for(pair, lines, quotes, prefs)
        if p.warnings or len(p.store_ids) < 2:
            continue
        if best is None or len(p.missing) < len(best.missing):
            best = p
        elif len(p.missing) == len(best.missing) and p.total <= best.total - SPLIT_MIN_SAVING:
            best = p
    if best is None:  # nothing eligible: fall back to the plan with fewest problems
        best = min(singles, key=lambda p: (len(p.missing), len(p.warnings), p.total))
    return best, sorted(singles, key=lambda p: (len(p.missing), p.total))


def optimize_basket(
    lines: list[BasketLine],
    quotes: list[StoreQuote],
    budget: int | None = None,
    prefs: dict[str, str | None] | None = None,
) -> Proposal:
    prefs = prefs or {}
    buyable = {q.store.store_id: q for q in quotes if q.store.checkout}
    reference = {pid: offers[0].price for q in quotes if not q.store.checkout for pid, offers in q.offers.items() if offers}
    if not buyable:
        raise ValueError("Захиалга авах боломжтой дэлгүүр алга")

    kept, dropped = list(lines), []
    chosen, alternatives = _best(kept, buyable, prefs)
    while budget and chosen.total > budget:
        droppable = [l for l in kept if l.reason == "due"]
        if not droppable:
            break  # only explicitly requested items left: report over budget, don't guess
        victim = min(droppable, key=lambda l: l.due_score or 0)
        kept.remove(victim)
        dropped.append(victim)
        chosen, alternatives = _best(kept, buyable, prefs)

    return Proposal(chosen=chosen, alternatives=alternatives, reference=reference, dropped=dropped, budget=budget)
