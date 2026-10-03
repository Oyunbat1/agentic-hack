"""Language layer: understand the request, explain the decision. Nothing else.

Adapter order: OyuLLM (hackathon requirement, OpenAI-compatible) → Claude → rules.
Swap by setting env vars; the orchestrator only sees `LanguageModel`.
"""

import json
import re
from typing import Protocol

import httpx

from sags.config import settings
from sags.contracts import ParsedRequest

PARSE_SYSTEM = (
    "You extract a grocery shopping request (usually Mongolian) into JSON. "
    "budget: integer MNT ('150к'/'150 мянга' = 150000, '1.2 сая' = 1200000) or null. "
    "add: extra product names the user explicitly wants, in Mongolian, singular. "
    "remove: product names the user explicitly does not want. "
    "use_usual: false only if the user asks for ONLY the named items."
)
EXPLAIN_SYSTEM = (
    "Чи хэрэглэгчийн талд ажилладаг хүнсний худалдан авалтын агент. Өгөгдсөн баримт дээр л тулгуурлан "
    "монгол хэлээр 2-4 өгүүлбэрээр тайлбарла: аль дэлгүүрийг яагаад сонгосон, хэдэн төгрөг хэмнэсэн, "
    "төсвөөс болж юу хассан, юу дутсан. Тоо зохиож болохгүй. Markdown хэрэглэхгүй."
)


class LanguageModel(Protocol):
    name: str

    async def parse(self, message: str) -> ParsedRequest: ...
    async def explain(self, facts: dict) -> str: ...


# ---------------- rules (no key needed) ----------------

_BUDGET = re.compile(r"(\d+(?:[.,]\d+)?)\s*(сая|мянга|мян|к|k|₮|төг)?", re.IGNORECASE)
_ADD = ("нэм", "авч өг", "бас ав", "ав")
_REMOVE = ("хэрэггүй", "битгий", "хас", "авахгүй")


class RuleModel:
    name = "rules"

    async def parse(self, message: str) -> ParsedRequest:
        text = message.lower()
        budget = None
        for num, unit in _BUDGET.findall(text):
            value = float(num.replace(",", "."))
            mult = {"сая": 1_000_000, "мянга": 1000, "мян": 1000, "к": 1000, "k": 1000}.get((unit or "").lower(), 1)
            if value * mult >= 1000:
                budget = int(value * mult)
                break
        add, remove = [], []
        for clause in re.split(r"[,.;!\n]| бас | мөн ", text):
            clause = clause.strip()
            if not clause or "сагс" in clause:
                continue
            if any(k in clause for k in _REMOVE):
                remove.append(_strip(clause, _REMOVE))
            elif any(clause.endswith(k) or f"{k} " in clause for k in _ADD):
                add.append(_strip(clause, _ADD))
        only = "зөвхөн" in text
        return ParsedRequest(budget=budget, add=[a for a in add if a], remove=[r for r in remove if r], use_usual=not only)

    async def explain(self, facts: dict) -> str:
        c = facts["chosen"]
        parts = [f"{' + '.join(c['stores'])} сонгосон: нийт {c['total_incl_delivery']:,}₮ (хүргэлт {c['delivery_fee']:,}₮ орсон)."]
        if facts.get("saving_vs_worst"):
            parts.append(f"Хамгийн үнэтэй хувилбараас {facts['saving_vs_worst']:,}₮ хэмнэлээ.")
        if facts.get("dropped"):
            parts.append(f"Төсөвт багтаахын тулд хассан: {', '.join(facts['dropped'])}.")
        if facts.get("missing"):
            parts.append(f"Олдоогүй: {', '.join(facts['missing'])}.")
        return " ".join(parts)


def _strip(clause: str, words: tuple[str, ...]) -> str:
    for w in sorted(words, key=len, reverse=True):
        clause = clause.replace(w, " ")
    clause = re.sub(r"\b(бас|мөн|бол|надад|бид|нь)\b", " ", clause)
    return re.sub(r"\s+", " ", clause).strip()


# ---------------- Claude ----------------


class ClaudeModel:
    def __init__(self):
        from anthropic import AsyncAnthropic

        self.client = AsyncAnthropic(api_key=settings().anthropic_api_key)
        self.model = settings().llm_model
        self.name = f"claude:{self.model}"

    async def parse(self, message: str) -> ParsedRequest:
        resp = await self.client.messages.parse(
            model=self.model,
            max_tokens=1024,
            system=PARSE_SYSTEM,
            messages=[{"role": "user", "content": message}],
            output_format=ParsedRequest,
        )
        return resp.parsed_output

    async def explain(self, facts: dict) -> str:
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=EXPLAIN_SYSTEM,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": json.dumps(facts, ensure_ascii=False)}],
        )
        return "".join(b.text for b in resp.content if b.type == "text").strip()


# ---------------- OyuLLM (OpenAI-compatible endpoint, details TBD at orientation) ----------------


class OyuLLMModel:
    def __init__(self):
        s = settings()
        self.http = httpx.AsyncClient(base_url=s.oyullm_base_url.rstrip("/"), headers={"Authorization": f"Bearer {s.oyullm_api_key}"}, timeout=30)
        self.model = s.oyullm_model
        self.name = f"oyullm:{self.model}"

    async def _chat(self, system: str, user: str, json_mode: bool = False) -> str:
        body = {"model": self.model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        resp = await self.http.post("/chat/completions", json=body)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    async def parse(self, message: str) -> ParsedRequest:
        schema = json.dumps(ParsedRequest.model_json_schema(), ensure_ascii=False)
        raw = await self._chat(f"{PARSE_SYSTEM}\nReturn ONLY JSON matching: {schema}", message, json_mode=True)
        return ParsedRequest.model_validate_json(raw[raw.find("{") : raw.rfind("}") + 1])

    async def explain(self, facts: dict) -> str:
        return (await self._chat(EXPLAIN_SYSTEM, json.dumps(facts, ensure_ascii=False))).strip()


def get_language_model() -> LanguageModel:
    s = settings()
    if s.oyullm_base_url:
        return OyuLLMModel()
    if s.anthropic_api_key:
        return ClaudeModel()
    return RuleModel()
