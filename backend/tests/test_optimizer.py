from sags.contracts import BasketLine, Offer, StoreInfo, StoreQuote
from sags.shopper.optimizer import optimize_basket


def quote(sid, delivery, prices, checkout=True, min_order=0, brands=None, stock=10):
    offers = {}
    for pid, price in prices.items():
        offers.setdefault(pid, []).append(Offer(store_id=sid, sku=f"{sid}-{pid}", product_id=pid, title=pid, price=price, stock=stock))
    for pid, brand, price in brands or []:
        offers.setdefault(pid, []).append(Offer(store_id=sid, sku=f"{sid}-{pid}-{brand}", product_id=pid, title=pid, brand=brand, price=price, stock=stock))
    return StoreQuote(store=StoreInfo(store_id=sid, name=sid, delivery_fee=delivery, min_order=min_order, checkout=checkout), offers=offers)


def line(pid, qty=1, reason="due", score=1.0):
    return BasketLine(product_id=pid, name_mn=pid, qty=qty, reason=reason, due_score=score)


def test_single_store_beats_split_when_delivery_eats_the_saving():
    a = quote("a", 3000, {"milk": 4000, "bread": 2500})
    b = quote("b", 3000, {"milk": 3900, "bread": 2600})
    p = optimize_basket([line("milk"), line("bread")], [a, b])
    assert len(p.chosen.store_ids) == 1


def test_split_when_it_saves_enough():
    a = quote("a", 1000, {"milk": 4000, "beef": 30000})
    b = quote("b", 1000, {"milk": 9000, "beef": 20000})
    p = optimize_basket([line("milk"), line("beef")], [a, b])
    assert p.chosen.store_ids == ["a", "b"]
    assert p.chosen.total == 4000 + 20000 + 2000


def test_budget_drops_least_due_first_never_requested():
    a = quote("a", 0, {"x": 5000, "y": 5000, "egg": 5000})
    lines = [line("x", score=0.9), line("y", score=1.5), line("egg", reason="requested", score=None)]
    p = optimize_basket(lines, [a], budget=11000)
    assert [d.product_id for d in p.dropped] == ["x"]
    assert p.chosen.total == 10000


def test_out_of_stock_goes_to_other_store():
    a = quote("a", 0, {"avocado": 4000}, stock=0)
    b = quote("b", 0, {"avocado": 4500})
    p = optimize_basket([line("avocado", qty=2)], [a, b])
    assert p.chosen.store_ids == ["b"] and not p.chosen.missing


def test_preferred_brand_within_15_percent():
    a = quote("a", 0, {}, brands=[("milk", "Cheap", 4000), ("milk", "Fav", 4500)])
    p = optimize_basket([line("milk")], [a], prefs={"milk": "Fav"})
    assert p.chosen.lines[0].offer.brand == "Fav"
    a2 = quote("a", 0, {}, brands=[("milk", "Cheap", 4000), ("milk", "Fav", 5000)])
    p2 = optimize_basket([line("milk")], [a2], prefs={"milk": "Fav"})
    assert p2.chosen.lines[0].offer.brand == "Cheap"


def test_min_order_makes_store_ineligible():
    a = quote("a", 0, {"milk": 3000}, min_order=10000)
    b = quote("b", 2000, {"milk": 3500})
    p = optimize_basket([line("milk")], [a, b])
    assert p.chosen.store_ids == ["b"]


def test_web_store_is_reference_only():
    a = quote("a", 0, {"milk": 4000})
    web = quote("emart", 0, {"milk": 3000}, checkout=False)
    p = optimize_basket([line("milk")], [a, web])
    assert p.chosen.store_ids == ["a"] and p.reference == {"milk": 3000}
