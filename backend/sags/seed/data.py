"""Deterministic demo data. No randomness: every seed produces the same demo.

Store names are fictional on purpose — real brand prices would look invented.
"""

import zlib

# (id, name_mn, aliases, category, unit, base_price ₮, brands, web search query, matching hint)
PRODUCTS: list[tuple] = [
    ("cabbage", "Байцаа", ["байцаа", "cabbage"], "ногоо", "кг", 3500, [None], "байцаа", "шинэ байцаа (cabbage), даршилсан биш"),
    ("cucumber", "Өргөст хэмх", ["өргөст хэмх", "хэмх", "cucumber"], "ногоо", "ш", 2400, [None], "өргөст хэмх", "шинэ өргөст хэмх, даршилсан биш"),
    ("carrot", "Лууван", ["лууван", "carrot"], "ногоо", "кг", 2800, [None], "лууван", "шинэ лууван (carrot), шүүс биш"),
    ("potato", "Төмс", ["төмс", "potato"], "ногоо", "кг", 1900, [None], "төмс", "шинэ төмс, чипс биш"),
    ("onion", "Сонгино", ["сонгино", "onion"], "ногоо", "кг", 2200, [None], "сонгино", "шинэ сонгино (onion)"),
    ("tomato", "Улаан лооль", ["улаан лооль", "лооль", "tomato"], "ногоо", "кг", 6500, [None], "улаан лооль", "шинэ улаан лооль, паста/кетчуп биш"),
    ("garlic", "Сармис", ["сармис", "garlic"], "ногоо", "ш", 1500, [None], "сармис", "шинэ сармис (garlic)"),
    ("bell_pepper", "Чинжүү", ["чинжүү", "амтат чинжүү", "pepper"], "ногоо", "кг", 9000, [None], "чинжүү", "шинэ амтат чинжүү"),
    ("broccoli", "Брокколи", ["брокколи", "broccoli"], "ногоо", "ш", 8900, [None], "брокколи", "шинэ брокколи"),
    ("avocado", "Авокадо", ["авокадо", "avocado"], "жимс", "ш", 4500, [None], "авокадо", "шинэ авокадо жимс (avocado fruit), тос биш"),
    ("apple", "Алим", ["алим", "apple"], "жимс", "кг", 6500, [None], "алим", "шинэ алим (apple), шүүс биш"),
    ("banana", "Гадил", ["гадил", "банана", "banana"], "жимс", "кг", 5500, [None], "гадил", "шинэ гадил (banana)"),
    ("lemon", "Нимбэг", ["нимбэг", "lemon"], "жимс", "ш", 2500, [None], "нимбэг", "шинэ нимбэг жимс, цай/шүүс биш"),
    ("orange", "Жүрж", ["жүрж", "orange"], "жимс", "кг", 6900, [None], "жүрж", "шинэ жүрж жимс, шүүс биш"),
    ("milk", "Сүү 1л", ["сүү", "milk"], "сүүн", "ш", 4200, ["Сүү ХК", "Милко"], "сүү 1л", "үнээний сүү 1 литр"),
    ("greek_yogurt", "Грек тараг", ["грек тараг", "йогурт", "yogurt"], "сүүн", "ш", 5900, ["Милко", "Tavan"], "тараг", "грек тараг / йогурт"),
    ("kefir", "Тараг 1л", ["тараг", "kefir"], "сүүн", "ш", 3500, ["Сүү ХК"], "тараг", "уудаг тараг"),
    ("cheese", "Бяслаг", ["бяслаг", "cheese"], "сүүн", "ш", 14900, ["Милко", "Tavan"], "бяслаг", "хатуу бяслаг"),
    ("butter", "Цөцгийн тос", ["цөцгийн тос", "масло", "butter"], "сүүн", "ш", 12900, ["Сүү ХК"], "цөцгийн тос", "цөцгийн тос (butter)"),
    ("eggs", "Өндөг 10ш", ["өндөг", "egg", "eggs"], "сүүн", "багц", 7500, ["Жаргалант", "Сэлэнгэ"], "өндөг", "тахианы өндөг (eggs), гал тогооны хэрэгсэл биш"),
    ("bread", "Талх", ["талх", "bread"], "талх", "ш", 2600, ["Талх Чихэр", "Атар Өргөө"], "талх", "талх (bread loaf)"),
    ("chicken_breast", "Тахианы цээж", ["тахианы цээж", "тахиа", "chicken"], "мах", "кг", 16900, [None], "тахианы цээж", "түүхий тахианы цээж мах"),
    ("beef", "Үхрийн мах", ["үхрийн мах", "үхэр", "beef"], "мах", "кг", 24000, [None], "үхрийн мах", "түүхий үхрийн мах"),
    ("mutton", "Хонины мах", ["хонины мах", "мах", "mutton"], "мах", "кг", 19000, [None], "хонины мах", "түүхий хонины мах"),
    ("rice", "Цагаан будаа", ["будаа", "цагаан будаа", "rice"], "хүнсний", "кг", 5200, ["Tsagaan", None], "цагаан будаа", "цагаан будаа (rice)"),
    ("buckwheat", "Сагаг", ["сагаг", "гречка", "buckwheat"], "хүнсний", "кг", 6900, [None], "сагаг", "сагаг (buckwheat)"),
    ("oats", "Овъёос", ["овъёос", "oats"], "хүнсний", "ш", 5900, ["Altan Taria"], "овъёос", "овъёос (oats)"),
    ("pasta", "Гоймон", ["гоймон", "макарон", "pasta"], "хүнсний", "ш", 3900, ["Altan Taria"], "гоймон", "хуурай гоймон / макарон"),
    ("flour", "Гурил", ["гурил", "flour"], "хүнсний", "кг", 3200, ["Altan Taria"], "гурил", "гурил (flour)"),
    ("sugar", "Элсэн чихэр", ["элсэн чихэр", "sugar"], "хүнсний", "кг", 3800, [None], "элсэн чихэр", "элсэн чихэр"),
    ("salt", "Давс", ["давс", "salt"], "хүнсний", "ш", 900, [None], "давс", "хоолны давс"),
    ("olive_oil", "Оливын тос", ["оливын тос", "olive oil"], "хүнсний", "ш", 24900, [None], "оливын тос", "оливын тос"),
    ("sunflower_oil", "Ургамлын тос", ["ургамлын тос", "тос", "oil"], "хүнсний", "ш", 8900, [None], "ургамлын тос", "ургамлын тос"),
    ("honey", "Зөгийн бал", ["зөгийн бал", "honey"], "хүнсний", "ш", 18900, [None], "зөгийн бал", "зөгийн бал"),
    ("tea", "Цай", ["цай", "tea"], "уух", "ш", 4500, [None], "цай", "хар цай"),
    ("coffee", "Кофе", ["кофе", "coffee"], "уух", "ш", 19900, [None], "кофе", "кофе"),
    ("water", "Ус 1.5л", ["ус", "water"], "уух", "ш", 1500, [None], "ундны ус", "ундны ус"),
    ("juice", "Жүүс", ["жүүс", "шүүс", "juice"], "уух", "ш", 6500, [None], "жүүс", "жимсний шүүс"),
    ("tissue", "Цаасан алчуур", ["салфетк", "цаасан алчуур", "tissue"], "ахуй", "ш", 3900, [None], "цаасан алчуур", "цаасан алчуур"),
    ("dish_soap", "Аяга угаагч", ["аяга угаагч", "угаагч", "dish soap"], "ахуй", "ш", 5900, [None], "аяга угаагч", "аяга угаагч шингэн"),
]

# store_id -> price level, delivery fee, min order. Altan is cheapest but has expensive delivery.
MOCK_STORES: dict[str, dict] = {
    "nogoon": {"level": 1.00, "delivery_fee": 3000, "min_order": 20000, "eta": "2 цагт"},
    "altan": {"level": 0.93, "delivery_fee": 7000, "min_order": 30000, "eta": "маргааш"},
    "khuns": {"level": 1.06, "delivery_fee": 2000, "min_order": 10000, "eta": "1 цагт"},
}

# Recurring habits of the demo user: product -> (interval days, days since last purchase, qty, brand)
# At seed time, cabbage/cucumber/carrot/avocado/milk/yogurt/apple are due (score >= 0.8).
HABITS: dict[str, tuple[int, int, int, str | None]] = {
    "cabbage": (14, 13, 1, None),
    "cucumber": (7, 7, 3, None),
    "carrot": (10, 9, 1, None),
    "avocado": (7, 8, 2, None),
    "milk": (4, 4, 2, "Сүү ХК"),
    "greek_yogurt": (7, 6, 2, "Милко"),
    "apple": (14, 12, 1, None),
    "bread": (5, 2, 1, "Талх Чихэр"),
    "rice": (30, 5, 1, "Tsagaan"),
    "chicken_breast": (10, 3, 1, None),
    "banana": (7, 3, 1, None),
}

HISTORY_DAYS = 75


def _h(*parts: str) -> int:
    return zlib.crc32("|".join(parts).encode())


def offers_for(store_id: str) -> list[dict]:
    cfg = MOCK_STORES[store_id]
    rows = []
    for pid, name, _aliases, _cat, unit, base, brands, *_ in PRODUCTS:
        for bi, brand in enumerate(brands):
            h = _h(store_id, pid, str(brand))
            if len(brands) > 1 and h % 3 == 0 and bi > 0:
                continue  # not every store carries every brand
            variation = 0.9 + (h % 21) / 100  # 0.90 .. 1.10
            price = int(round(base * cfg["level"] * variation / 50) * 50)
            stock = 0 if h % 11 == 0 else 5 + h % 40
            if (store_id, pid) == ("altan", "avocado"):
                stock = 0  # demo: cheapest store is out of avocados
            title = f"{name} {brand}" if brand else name
            rows.append(
                {
                    "store_id": store_id,
                    "sku": f"{store_id}-{pid}-{bi}",
                    "product_id": pid,
                    "title": title,
                    "brand": brand,
                    "price": price,
                    "unit": unit,
                    "stock": stock,
                }
            )
    return rows
