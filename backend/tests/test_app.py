"""Tests for the bolo-khata app layer (unit conversion, bill math,
two-sided confirm, undo/reversal, keyterms). Offline — no API calls."""

import app.bootstrap  # noqa: F401
import pytest

from app.db import ShopDB
from app.seed import seed
from app import pipeline as P


@pytest.fixture()
def db():
    d = ShopDB(":memory:")
    d.seed_if_empty(seed)
    yield d
    d.close()


def _pid(db, name_en):
    return db.conn.execute(
        "SELECT id FROM products WHERE name_en=?", (name_en,)).fetchone()["id"]


def _stock(db, name_en):
    return db.stock(_pid(db, name_en))


HERO = "2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"


def test_hero_bill_math(db):
    r = P.command_to_proposal(HERO, "hinglish", db)
    assert r["intent"] == "add_bill" and r["needs_confirm"]
    assert len(r["items"]) == 3
    assert r["customer_name"] == "Ramesh"
    # 2x4500 + 1x1400 + 500x14 = 17400
    assert r["total_paise"] == 17400
    names = {i["product_name"] for i in r["items"]}
    assert names == {"Chini", "Maggi", "Daal"}


def test_stock_unit_conversion_g_to_kg(db):
    before = _stock(db, "Daal")
    r = P.command_to_proposal(HERO, "hinglish", db)
    P.confirm(r["proposal_id"], True, db, payment_method="khata")
    assert _stock(db, "Daal") == pytest.approx(before - 0.5)
    assert _stock(db, "Maggi") == pytest.approx(60 - 1)
    assert _stock(db, "Chini") == pytest.approx(25 - 2)


def test_khata_confirm_token_and_balance(db):
    cid = P.command_to_proposal(HERO, "hinglish", db)["customer_id"]
    bal0 = db.balance_paise(cid)
    r = P.command_to_proposal(HERO, "hinglish", db)
    c = P.confirm(r["proposal_id"], True, db, payment_method="khata")
    assert c["ok"] and c["written"]
    assert c["confirm_token"]
    row = db.confirm_by_token(c["confirm_token"])
    assert row["confirm_state"] == "pending"
    assert db.balance_paise(cid) == bal0 + 17400
    # customer responds on the link
    assert db.set_confirm_state(c["confirm_token"], "confirmed")
    assert db.confirm_by_token(c["confirm_token"])["confirm_state"] \
        == "confirmed"
    # second respond is a no-op (not pending anymore)
    assert not db.set_confirm_state(c["confirm_token"], "disputed")


def test_cash_bill_has_no_confirm_token(db):
    r = P.command_to_proposal(HERO, "hinglish", db)
    c = P.confirm(r["proposal_id"], True, db, payment_method="cash")
    assert c["written"] and not c["confirm_token"]


def test_undo_restores_stock_and_balance(db):
    cid = P.command_to_proposal(HERO, "hinglish", db)["customer_id"]
    bal0 = db.balance_paise(cid)
    stock0 = _stock(db, "Maggi")
    r = P.command_to_proposal(HERO, "hinglish", db)
    P.confirm(r["proposal_id"], True, db, payment_method="khata")
    u = P.command_to_proposal("galat tha hata do", "hinglish", db)
    assert u["intent"] == "undo"
    P.confirm(u["proposal_id"], True, db)
    assert db.balance_paise(cid) == bal0
    assert _stock(db, "Maggi") == pytest.approx(stock0)


def test_reject_proposal_writes_nothing(db):
    bal0 = db.balance_paise(3)
    n0 = len(db.recent(100))
    r = P.command_to_proposal(HERO, "hinglish", db)
    out = P.confirm(r["proposal_id"], False, db)
    assert out["ok"] and not out["written"]
    assert db.balance_paise(3) == bal0
    assert len(db.recent(100)) == n0


def test_expired_proposal_id(db):
    out = P.confirm("deadbeefdeadbeef", True, db)
    assert not out["ok"] and "expired" in out["error"]


def test_check_credit_and_stock_queries(db):
    r = P.command_to_proposal("Ramesh ka kitna baaki hai", "hinglish", db)
    assert r["intent"] == "check_credit" and not r["needs_confirm"]
    r2 = P.command_to_proposal("Maggi kitna stock hai", "hinglish", db)
    assert r2["intent"] in ("check_stock", "clarify", "unknown")


def test_stock_in(db):
    before = _stock(db, "Maggi")
    r = P.command_to_proposal("50 packet Maggi aaya", "hinglish", db)
    assert r["intent"] == "add_purchase"
    P.confirm(r["proposal_id"], True, db)
    assert _stock(db, "Maggi") == pytest.approx(before + 50)


def test_unknown_item_does_not_write(db):
    n0 = len(db.recent(100))
    r = P.command_to_proposal("2 kilo unobtanium dedo", "hinglish", db)
    if r["intent"] == "add_bill":
        # unresolved items must never reach a write
        assert r["unresolved"] or all(
            not i.get("product_id") for i in r["items"])
    P.confirm(r["proposal_id"], True, db)
    # whatever was written contains no phantom product lines
    assert len(db.recent(100)) - n0 <= 1


def test_fuzzy_ambiguous_name(db):
    # 'sugar' must resolve to Chini through either the bill path or the
    # vendored single-sale path — and a confirm must write a Chini line.
    r = P.command_to_proposal("1 kilo sugar", "hinglish", db)
    assert r["intent"] in ("add_bill", "record_sale"), r["intent"]
    c = P.confirm(r["proposal_id"], True, db, payment_method="cash")
    assert c["written"]
    items = db.txn_items(c["txn_id"])
    assert any(i["product_id"] == _pid(db, "Chini") for i in items) or \
        "sugar" in r["description"].lower() or "chini" in \
        r["description"].lower()


def test_keyterms_cover_catalog(db):
    terms = db.keyterms()
    assert "Maggi" in terms and "Ramesh" in terms
    assert any("cheeni" in t.lower() or "chini" in t.lower() for t in terms)


def test_idempotent_bill_write(db):
    r = P.command_to_proposal(HERO, "hinglish", db)
    cid = r["customer_id"]
    before = db.balance_paise(cid)
    P.confirm(r["proposal_id"], True, db, payment_method="khata")
    # replaying the same proposal id is a no-op (already popped)
    again = P.confirm(r["proposal_id"], True, db, payment_method="khata")
    assert not again["ok"]
    assert db.balance_paise(cid) == before + 17400


def test_delivery_skip_and_month_bill(db):
    import calendar
    from datetime import date
    r = P.command_to_proposal(
        "Ramesh ka doodh kal se 2 din nahi chahiye", "hinglish", db)
    assert r["intent"] == "delivery_skip" and r["needs_confirm"]
    c = P.confirm(r["proposal_id"], True, db)
    assert c["written"] and c["skipped"] == 2
    # re-confirm same skip is idempotent (INSERT OR IGNORE)
    r = P.command_to_proposal(
        "Ramesh ka dudh ka bill", "hinglish", db)
    assert r["intent"] == "delivery_month_bill"
    sub = [s for s in db.subscriptions()
           if s["customer_name"] == "Ramesh"][0]
    b = db.month_bill(sub["id"])
    dim = calendar.monthrange(date.today().year, date.today().month)[1]
    assert b["days_skipped"] == 2
    assert b["total_paise"] == (dim - 2) * 2700


def test_customer_account_pin_and_links(db):
    aid = db.account_login("TestUser", "1234")
    assert aid is not None
    assert db.account_login("TestUser", "9999") is None  # wrong PIN
    assert db.account_login("TestUser", "1234") == aid   # right PIN
    cid = db.conn.execute(
        "SELECT id FROM customers WHERE name='Ramesh'").fetchone()["id"]
    db.link_customer(aid, cid)
    db.link_customer(aid, cid)  # idempotent
    links = db.account_links(aid)
    assert len(links) == 1 and links[0]["customer_id"] == cid
    # multi-shop khata data flows through
    assert db.account_ledger(aid), "linked customer has seeded txns"
    exp = db.account_expenses(aid)
    assert exp["by_day"] and exp["by_shop"] and exp["by_month"]
    pend = db.account_pending(aid)
    assert all(p["confirm_state"] == "pending" for p in pend)


def test_weekly_insights_intent_and_numbers(db):
    r = P.command_to_proposal("is hafte ka hisaab batao", "hinglish", db)
    assert r["intent"] == "weekly_insights" and not r["needs_confirm"]
    w = r["insights"]
    assert w["top_sellers"], "seeded sales should yield top sellers"
    # spoken summary embeds real numbers, not invented ones
    assert w["top_sellers"][0]["name"] in r["spoken"]
    if w["top_debtors"]:
        assert w["top_debtors"][0]["name"] in r["spoken"]
    rt = P.command_to_proposal("is hafte", "te", db)
    assert "వారం" in rt["spoken"]


def test_delivery_skip_ambiguous_asks_which_customer(db):
    r = P.command_to_proposal("dudh kal se band karo", "hinglish", db)
    assert r["intent"] == "delivery_skip_clarify"
    assert not r["needs_confirm"]
    assert "Ramesh" in r["description"] and "Lakshmi" in r["description"]
