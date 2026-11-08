"""product-v1 tests: signup/login, role enforcement, shop setup,
business-type -> modules, bill edit recompute, unknown-item flow,
customer signup + join. Offline — no Gnani calls."""

import app.bootstrap  # noqa: F401
import pytest

from app.db import ShopDB
from app.seed import seed
from app import pipeline as P


@pytest.fixture()
def db(tmp_path):
    d = ShopDB(tmp_path / "t.db")
    d.seed_if_empty(seed)
    yield d
    d.close()


# ------------------------------------------------------------- users
def test_signup_login_and_password_rules(db):
    uid = db.create_user("a@b.in", "Passw0rd1", "Asha")
    row = db.user_by_email("a@b.in")
    assert row["id"] == uid and db.check_user_password(row, "Passw0rd1")
    assert not db.check_user_password(row, "wrong")
    assert db.user_by_email("A@B.IN")["id"] == uid  # case-insensitive


def test_multi_shop_isolation(db):
    """Two shops: catalogs, customers and ledgers do not leak."""
    sid2 = db.create_shop("Verma Milk", "milk")
    d2 = db.for_shop(sid2)
    d2.add_product("Doodh", aliases="doodh,milk", unit="liter",
                   price_paise=6000, stock=10)
    d2.add_customer("ShopTwoCustomer")
    assert len(d2.products()) == 1
    assert not any(p["name_en"] == "Maggi" for p in d2.products())
    # shop 1 unchanged
    assert all(c["name"] != "ShopTwoCustomer" for c in db.customers())
    assert any(p["name_en"] == "Maggi" for p in db.products())


def test_join_uses_scanned_shop(db):
    """join() regression: a customer joining shop 2 must not land in
    shop 1's customer list."""
    sid2 = db.create_shop("Other Shop", "kirana")
    sdb = db.for_shop(sid2)
    cid = sdb.add_customer("Joiner")
    sdb.link_customer(999, cid)
    assert all(c["name"] != "Joiner" for c in db.customers())
    assert any(c["name"] == "Joiner" for c in sdb.customers())


# ------------------------------------------------------- bill editing
def test_bill_edit_recomputes(db):
    pid_chini = _pid = db.conn.execute(
        "SELECT id FROM products WHERE name_en='Chini'").fetchone()["id"]
    pid_maggi = db.conn.execute(
        "SELECT id FROM products WHERE name_en='Maggi'").fetchone()["id"]
    cid = db.conn.execute(
        "SELECT id FROM customers WHERE name='Ramesh'").fetchone()["id"]
    prop = P.edit_bill([
        {"product_id": pid_chini, "qty": 3, "unit": "kg"},
        {"product_id": pid_maggi, "qty": 2, "unit": "packet"},
    ], db, customer_id=cid, lang="hinglish")
    assert prop["kind"] == "bill" and prop["proposal_id"]
    # 3 kg x 45 = 135 + 2 x 14 = 28 -> 163
    assert prop["total_paise"] == 16300
    assert prop["customer_name"] == "Ramesh"
    # confirm writes the EDITED bill
    c = P.confirm(prop["proposal_id"], True, db, payment_method="khata")
    assert c["written"] and c["confirm_token"]
    row = db.confirm_by_token(c["confirm_token"])
    assert row["amount_paise"] == 16300


def test_bill_edit_staff_cannot_override_price(db):
    pid = db.conn.execute(
        "SELECT id FROM products WHERE name_en='Chini'").fetchone()["id"]
    prop = P.edit_bill(
        [{"product_id": pid, "qty": 1, "unit": "kg",
          "unit_price_paise": 100}],
        db, allow_price_override=False)
    # staff override ignored -> catalog 45/kg
    assert prop["items"][0]["line_total_paise"] == 4500


def test_bill_edit_owner_price_override(db):
    pid = db.conn.execute(
        "SELECT id FROM products WHERE name_en='Chini'").fetchone()["id"]
    prop = P.edit_bill(
        [{"product_id": pid, "qty": 1, "unit": "kg",
          "unit_price_paise": 9900}],
        db, allow_price_override=True)
    assert prop["items"][0]["line_total_paise"] == 9900


def test_bill_edit_unresolved_item_stays_visible(db):
    prop = P.edit_bill(
        [{"name": "boroline cream", "qty": 1, "unit": "piece"}],
        db)
    assert "boroline cream" in prop["unresolved"]
    assert prop["needs_confirm"]


def test_bill_edit_empty_returns_none(db):
    assert P.edit_bill([], db) is None
    assert P.edit_bill([{"product_id": 1, "qty": 0, "unit": "kg"}],
                     db) is None


def test_unknown_item_flagged_not_dropped(db):
    r = P.command_to_proposal(
        "2 kilo cheeni, 1 boroline cream, Ramesh ke naam",
        "hinglish", db)
    assert "boroline cream" in r["unresolved"]
    names = [i["product_name"] or i["name"] for i in r["items"]]
    assert any("Chini" in n for n in names)
    assert r["confidence"] <= 0.4


def test_ambiguous_item_gets_options(db):
    """'cheeni patti' could be Chini or Chai Patti — the parser must not
    pick silently; it attaches options for the ask-back UI."""
    r = P.command_to_proposal(
        "1 cheeni patti, Ramesh ke naam", "hinglish", db)
    item = r["items"][0]
    assert item["options"] and "Chai Patti" in item["options"]
    assert r["confidence"] <= 0.55


# ------------------------------------------------------- staff invite
def test_staff_invite_flow(db):
    code = db.create_staff_invite("Bittu")
    row = db.staff_by_invite(code)
    assert row and row["name"] == "Bittu"
    db.staff_set_pin(row["id"], "4321")
    assert db.staff_login("Bittu", "4321") == row["id"]
    assert db.staff_by_invite(code) is None  # code consumed


def test_customer_signup(db):
    aid = db.account_signup("NewCust", "1357", "c@x.in")
    assert aid
    assert db.account_signup("NewCust", "9999") is None  # taken
    assert db.account_login("NewCust", "1357") == aid


# ------------------------------------------------- type -> modules
def test_business_type_modules():
    from app.biztypes import BUSINESS_TYPES, effective_modules
    milk = effective_modules({"business_type": "milk", "modules": {}})
    assert milk["delivery"] and not milk["stock"]
    kirana = effective_modules(
        {"business_type": "kirana", "modules": {}})
    assert kirana["stock"] and kirana["billing"]
    veg = effective_modules(
        {"business_type": "fruit_veg", "modules": {}})
    assert veg["stock"] and not veg["delivery"]
