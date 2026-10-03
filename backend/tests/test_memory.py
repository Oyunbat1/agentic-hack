from datetime import datetime, timedelta, timezone

from sags.memory.service import due_score, habit_from_history
from sags.shopper.llm import RuleModel


def test_due_score():
    assert due_score(7, 7, 1.0) == 1.0
    assert due_score(7, 7, 0.6) == 0.6  # user removed it once → weaker suggestion
    assert due_score(3, 0, 1.0) == 3.0  # interval floor avoids division by zero


def test_habit_from_history():
    t = datetime(2026, 9, 1, tzinfo=timezone.utc)
    avg, qty = habit_from_history([t, t + timedelta(days=7), t + timedelta(days=14)], [2, 3, 2])
    assert avg == 7.0 and qty == 2


async def test_rule_parser_mongolian():
    p = await RuleModel().parse("Энэ долоо хоногийн сагсаа 150к-д бэлд, өндөг нэм")
    assert p.budget == 150000
    assert p.add == ["өндөг"]
    assert p.use_usual
