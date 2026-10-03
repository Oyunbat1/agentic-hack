"""Jev (TypeSafe AI) — the fast, typed decision layer.

Jev answers Choice / Score / Noul questions with calibrated confidence in
~100-500ms. We use it for semantic judgements only (intent, "is this search
result the product we want?"). Money, budget and stock rules stay in code.
Docs: https://docs.typesafe.ai
"""

from typing import Any

import httpx

from sags.config import settings

JEV_URL = "https://api.typesafe.ai/v1/systemone"


class JevUnavailable(RuntimeError):
    pass


async def ask(http: httpx.AsyncClient, state: str | dict, questions: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Raw call. Question shapes:
    choice: {"type": "choice", "instructions": str, "criteria": {option: description}}
    score:  {"type": "score",  "instructions": str, "criteria": [level0, level1, ...]}
    noul:   {"type": "noul",   "instructions": str}
    """
    key = settings().typesafe_api_key
    if not key:
        raise JevUnavailable("TYPESAFE_API_KEY is not set")
    resp = await http.post(
        JEV_URL,
        headers={"Authorization": f"Bearer {key}"},
        json={"state": state, "model": settings().jev_model, "questions": questions},
        timeout=8.0,
    )
    if resp.status_code != 200:
        raise JevUnavailable(f"Jev {resp.status_code}: {resp.text[:200]}")
    return resp.json()["answers"]


async def classify_intent(http: httpx.AsyncClient, message: str) -> tuple[str, float]:
    answers = await ask(
        http,
        message,
        {
            "intent": {
                "type": "choice",
                "instructions": "The user talks to a grocery shopping agent (often in Mongolian). What do they want?",
                "criteria": {
                    "weekly_basket": "Prepare their usual/recurring grocery basket, possibly with extra items or a budget",
                    "specific_items": "Buy only specific named items, not the usual basket",
                    "not_shopping": "Small talk or a question that is not a purchase request",
                },
            }
        },
    )
    a = answers["intent"]
    return a["choice"], float(a["confidence"])


async def pick_matches(http: httpx.AsyncClient, items: dict[str, tuple[str, str | None, list[str]]]) -> dict[str, tuple[int | None, float]]:
    """For each wanted product, which store search result is it? ONE Jev call for the whole basket.

    items: key -> (wanted name, hint, result titles). Returns key -> (best result index or None, confidence).
    Several results are often equally right (5 identical cucumbers), which splits the choice
    probability, so confidence = 1 - P(none) = "some result here is the product".
    """
    questions = {}
    for key, (wanted, hint, titles) in items.items():
        if not titles:
            continue
        criteria = {f"r{i}": t for i, t in enumerate(titles[:20])}
        criteria["none"] = "Энэ жагсаалтад хайсан бараа байхгүй (none of these is the product)"
        questions[key] = {
            "type": "choice",
            "instructions": f"Хайж буй бараа: {wanted} — {hint or wanted}. Дэлгүүрийн хайлтын үр дүнгээс яг энэ барааг сонго; "
            "уламжлал бүтээгдэхүүн (тос, шүүс, соус, хэрэгсэл) биш. Which result is exactly this grocery product?",
            "criteria": criteria,
        }
    if not questions:
        return {k: (None, 1.0) for k in items}
    answers = await ask(http, "Grocery product matching for a shopping agent.", questions)
    out: dict[str, tuple[int | None, float]] = {k: (None, 1.0) for k in items}
    for key, a in answers.items():
        probs: dict[str, float] = a["probabilities"]
        best = max((k for k in probs if k != "none"), key=lambda k: probs[k], default=None)
        out[key] = (int(best[1:]) if best else None), round(1.0 - probs.get("none", 0.0), 2)
    return out
