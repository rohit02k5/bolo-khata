"""Data layer — SQLite now, Postgres-ready later.

Implements the same surface the vendored bolta core expects
(products()/customers()/balance_paise()/stock()/conn) plus the new
product tables the app needs: priced products, itemized bill lines,
customer-confirmation tokens, reminders, idempotency, audit.

Money is integer paise. The ledger is append-only — undo marks the row
'undone' and writes a compensating transaction.
"""

from __future__ import annotations

import json
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'kirana',
    vpa TEXT DEFAULT '',
    join_code TEXT UNIQUE,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    name_en TEXT NOT NULL,
    name_hi TEXT DEFAULT '',
    name_te TEXT DEFAULT '',
    aliases TEXT DEFAULT '',
    unit TEXT NOT NULL DEFAULT 'piece',
    pack_size INTEGER DEFAULT 1,
    price_paise INTEGER DEFAULT 0,
    stock REAL DEFAULT 0,
    reorder_point REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    aliases TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    lang_pref TEXT DEFAULT 'hinglish'
);
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    ts REAL NOT NULL,
    kind TEXT NOT NULL,           -- sale|credit_sale|payment|purchase|adjust
    customer_id INTEGER,
    product_id INTEGER,           -- single-product txns (vendored compat)
    qty REAL,
    unit TEXT,
    amount_paise INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    source TEXT DEFAULT 'voice',  -- voice|tap|seed|undo
    status TEXT DEFAULT 'ok',     -- ok|undone
    reverses_id INTEGER,
    payment_method TEXT DEFAULT '', -- cash|upi|khata
    confirm_state TEXT DEFAULT 'none', -- none|pending|confirmed|disputed
    confirm_token TEXT UNIQUE,
    idempotency_key TEXT UNIQUE,
    audio_hash TEXT,
    transcript TEXT,
    stt_confidence REAL
);
CREATE TABLE IF NOT EXISTS txn_items (
    id INTEGER PRIMARY KEY,
    txn_id INTEGER NOT NULL REFERENCES transactions(id),
    product_id INTEGER,
    name TEXT DEFAULT '',
    qty REAL,
    unit TEXT,
    unit_price_paise INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty_per_day REAL NOT NULL,
    unit TEXT DEFAULT 'packet',
    price_paise INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS delivery_skips (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    day TEXT NOT NULL,           -- YYYY-MM-DD Asia/Kolkata
    UNIQUE(subscription_id, day)
);
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    role TEXT DEFAULT 'assistant',
    active INTEGER DEFAULT 1,
    UNIQUE(shop_id, name)
);
CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    day TEXT NOT NULL,           -- YYYY-MM-DD
    marked_by TEXT NOT NULL,     -- 'owner'
    state TEXT DEFAULT 'pending',-- pending|accepted|disputed
    created REAL DEFAULT 0,
    decided_at REAL
);
CREATE TABLE IF NOT EXISTS leave_events (
    id INTEGER PRIMARY KEY,
    leave_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    ts REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customer_accounts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    created REAL DEFAULT 0,
    UNIQUE(name)
);
CREATE TABLE IF NOT EXISTS customer_links (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    UNIQUE(account_id, customer_id)
);
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    kind TEXT NOT NULL,           -- restock|timed|voice_note
    payload TEXT DEFAULT '{}',
    due_at REAL,
    done INTEGER DEFAULT 0,
    audio_path TEXT DEFAULT '',
    token TEXT UNIQUE,
    customer_id INTEGER
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    ts REAL NOT NULL,
    actor TEXT DEFAULT 'owner',
    action TEXT NOT NULL,
    txn_id INTEGER,
    payload TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS api_call_log (
    id INTEGER PRIMARY KEY,
    ts REAL NOT NULL,
    service TEXT NOT NULL,        -- stt|tts
    ms INTEGER,
    ok INTEGER DEFAULT 1,
    cached INTEGER DEFAULT 0
);
"""

SHOP_ID = 1


class ShopDB:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        # forward-migrations for DBs created by older schemas
        cols = {r[1] for r in
                self.conn.execute("PRAGMA table_info(shops)")}
        if "join_code" not in cols:
            self.conn.execute(
                "ALTER TABLE shops ADD COLUMN join_code TEXT")
        rcols = {r[1] for r in
                 self.conn.execute("PRAGMA table_info(reminders)")}
        if "token" not in rcols:
            self.conn.execute("ALTER TABLE reminders ADD COLUMN token TEXT")
        if not self.conn.execute("SELECT id FROM shops WHERE id=?",
                                 (SHOP_ID,)).fetchone():
            self.conn.execute(
                "INSERT INTO shops (id,name,business_type,vpa,join_code,"
                "created_at) VALUES (?,?,?,?,?,?)",
                (SHOP_ID, "Sharma Kirana Store", "kirana", "",
                 uuid.uuid4().hex[:12], time.time()))
        elif not self.conn.execute(
                "SELECT join_code FROM shops WHERE id=?",
                (SHOP_ID,)).fetchone()["join_code"]:
            self.conn.execute(
                "UPDATE shops SET join_code=? WHERE id=?",
                (uuid.uuid4().hex[:12], SHOP_ID))
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # ---------------------------------------------------- bolta-compatible
    def products(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM products WHERE shop_id=?", (SHOP_ID,)).fetchall()

    def customers(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM customers WHERE shop_id=?", (SHOP_ID,)).fetchall()

    def stock(self, product_id: int) -> float:
        row = self.conn.execute(
            "SELECT stock FROM products WHERE id=?", (product_id,)).fetchone()
        return float(row["stock"]) if row else 0.0

    def balance_paise(self, customer_id: int) -> int:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(CASE WHEN kind='credit_sale' "
            "THEN amount_paise WHEN kind='payment' THEN -amount_paise "
            "ELSE 0 END),0) AS bal FROM transactions "
            "WHERE customer_id=? AND status='ok'", (customer_id,)).fetchone()
        return int(row["bal"])

    # ------------------------------------------------------------- catalog
    def add_product(self, name_en: str, name_hi: str = "", name_te: str = "",
                    *, aliases: str = "", unit: str = "piece",
                    pack_size: int = 1, price_paise: int = 0,
                    stock: float = 0.0, reorder_point: float = 0.0) -> int:
        cur = self.conn.execute(
            "INSERT INTO products (shop_id,name_en,name_hi,name_te,aliases,"
            "unit,pack_size,price_paise,stock,reorder_point) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (SHOP_ID, name_en, name_hi, name_te, aliases, unit, pack_size,
             price_paise, stock, reorder_point))
        self.conn.commit()
        return cur.lastrowid

    def add_customer(self, name: str, *, aliases: str = "",
                     phone: str = "", lang_pref: str = "hinglish") -> int:
        cur = self.conn.execute(
            "INSERT INTO customers (shop_id,name,aliases,phone,lang_pref) "
            "VALUES (?,?,?,?,?)",
            (SHOP_ID, name, aliases, phone, lang_pref))
        self.conn.commit()
        return cur.lastrowid

    def price_paise(self, product_id: int) -> int:
        row = self.conn.execute(
            "SELECT price_paise FROM products WHERE id=?",
            (product_id,)).fetchone()
        return int(row["price_paise"]) if row else 0

    # ------------------------------------------------------------- units
    _MASS_VOL = {"kg": 1000.0, "g": 1.0, "l": 1000.0, "ml": 1.0}

    def _stock_qty(self, qty: float, item_unit: str,
                   product_id: int) -> float:
        """Convert a spoken qty+unit into the product's stock unit.

        products.stock is kept in products.unit (kg/g/l/ml/piece/packet).
        'packet'/'piece' on a weighed product uses pack_size (in stock
        units, e.g. pack_size=1 on a kg product = 1 kg per packet).
        """
        row = self.conn.execute(
            "SELECT unit, pack_size FROM products WHERE id=?",
            (product_id,)).fetchone()
        if row is None:
            return qty
        p_unit, pack = row["unit"], float(row["pack_size"] or 1.0)
        iu = (item_unit or "piece").lower()
        if iu == p_unit:
            return qty
        if iu in self._MASS_VOL and p_unit in self._MASS_VOL:
            return qty * self._MASS_VOL[iu] / self._MASS_VOL[p_unit]
        if iu in ("packet", "piece"):
            if p_unit in ("packet", "piece"):
                return qty
            return qty * pack
        return qty

    # ------------------------------------------------------------ txns
    def _txn(self, kind: str, *, customer_id=None, product_id=None,
             qty=None, unit=None, amount_paise=0, note="",
             source="voice", payment_method="", confirm_state="none",
             confirm_token=None, idempotency_key=None, audio_hash=None,
             transcript=None, stt_confidence=None, reverses_id=None) -> int:
        cur = self.conn.execute(
            "INSERT INTO transactions (shop_id,ts,kind,customer_id,"
            "product_id,qty,unit,"
            "amount_paise,note,source,payment_method,confirm_state,"
            "confirm_token,idempotency_key,audio_hash,transcript,"
            "stt_confidence,reverses_id) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (SHOP_ID, time.time(), kind, customer_id, product_id, qty,
             unit, amount_paise, note,
             source, payment_method, confirm_state, confirm_token,
             idempotency_key, audio_hash, transcript, stt_confidence,
             reverses_id))
        self.conn.commit()
        return cur.lastrowid

    def record_bill(self, items: list[dict], *, customer_id=None,
                    payment_method="khata", credit=True, source="voice",
                    audio_hash=None, transcript=None, stt_confidence=None,
                    idempotency_key=None,
                    confirm_state="none") -> tuple[int, str]:
        """Itemized bill: one transactions row + txn_items rows + stock out.

        Returns (txn_id, confirm_token). If the bill is going to a khata
        customer, a pending confirmation token is minted.
        """
        total = sum(int(round(float(i["qty"]) * i["unit_price_paise"]))
                    for i in items)
        kind = "credit_sale" if credit else "sale"
        token = uuid.uuid4().hex if (credit and customer_id) else None
        if confirm_state == "none" and token:
            confirm_state = "pending"
        single = len(items) == 1
        first = items[0] if single else {}
        tid = self._txn(
            kind, customer_id=customer_id,
            product_id=first.get("product_id"), qty=first.get("qty"),
            unit=first.get("unit"), amount_paise=total,
            source=source, payment_method=payment_method,
            confirm_state=confirm_state, confirm_token=token,
            idempotency_key=idempotency_key, audio_hash=audio_hash,
            transcript=transcript, stt_confidence=stt_confidence)
        for i in items:
            self.conn.execute(
                "INSERT INTO txn_items (txn_id,product_id,name,qty,unit,"
                "unit_price_paise) VALUES (?,?,?,?,?,?)",
                (tid, i.get("product_id"), i.get("name", ""), i.get("qty"),
                 i.get("unit"), int(i.get("unit_price_paise", 0))))
            if i.get("product_id") and i.get("qty"):
                self.conn.execute(
                    "UPDATE products SET stock = stock - ? WHERE id=?",
                    (self._stock_qty(float(i["qty"]), i.get("unit", ""),
                                     i["product_id"]), i["product_id"]))
        self.conn.commit()
        return tid, (token or "")

    def record_payment(self, customer_id: int, amount_paise: int, *,
                       source="voice", payment_method="cash",
                       audio_hash=None, transcript=None,
                       idempotency_key=None) -> int:
        return self._txn("payment", customer_id=customer_id,
                         amount_paise=amount_paise, source=source,
                         payment_method=payment_method,
                         audio_hash=audio_hash, transcript=transcript,
                         idempotency_key=idempotency_key)

    def record_sale(self, product_id, qty, *, customer_id=None,
                    amount_paise=0, credit=False, unit="piece", note="",
                    source="voice", audio_hash=None, transcript=None,
                    idempotency_key=None) -> int:
        """bolta.actions.apply() compat — single-product sale."""
        items = [{"product_id": product_id, "qty": qty or 1.0,
                  "unit": unit, "name": "", "unit_price_paise":
                      int(amount_paise / qty) if qty else amount_paise}]
        tid, _ = self.record_bill(
            items, customer_id=customer_id,
            payment_method="khata" if credit else "cash", credit=credit,
            source=source, audio_hash=audio_hash, transcript=transcript,
            idempotency_key=idempotency_key)
        return tid

    def add_purchase(self, product_id, qty, *, unit="piece", amount_paise=0,
                     note="", source="voice", audio_hash=None,
                     transcript=None, idempotency_key=None) -> int:
        tid = self._txn("purchase", product_id=product_id, qty=qty,
                        unit=unit, amount_paise=amount_paise, note=note,
                        source=source, audio_hash=audio_hash,
                        transcript=transcript,
                        idempotency_key=idempotency_key)
        self.conn.execute(
            "INSERT INTO txn_items (txn_id,product_id,qty,unit) "
            "VALUES (?,?,?,?)", (tid, product_id, qty, unit))
        if product_id and qty:
            self.conn.execute(
                "UPDATE products SET stock = stock + ? WHERE id=?",
                (self._stock_qty(float(qty), unit, product_id), product_id))
        self.conn.commit()
        return tid

    def adjust_stock(self, product_id: int, delta_qty: float, *,
                     unit: str = "piece", note: str = "",
                     source: str = "voice", transcript: str = "",
                     idempotency_key: str | None = None) -> int:
        """Stock-out/damage adjust: txn kind 'adjust' + stock update."""
        tid = self._txn("adjust", product_id=product_id, qty=delta_qty,
                        unit=unit, note=note, source=source,
                        transcript=transcript,
                        idempotency_key=idempotency_key)
        stock_delta = self._stock_qty(abs(delta_qty), unit, product_id)
        self.conn.execute(
            "UPDATE products SET stock = stock + ? WHERE id=?",
            (stock_delta if delta_qty >= 0 else -stock_delta, product_id))
        self.conn.commit()
        return tid

    def add_reminder(self, kind: str, payload: dict, *,
                     due_at: float | None = None,
                     customer_id: int | None = None,
                     audio_path: str = "") -> int:
        cur = self.conn.execute(
            "INSERT INTO reminders (shop_id,kind,payload,due_at,"
            "audio_path,token,customer_id) VALUES (?,?,?,?,?,?,?)",
            (SHOP_ID, kind,
             json.dumps(payload, ensure_ascii=False), due_at,
             audio_path, uuid.uuid4().hex, customer_id))
        self.conn.commit()
        return cur.lastrowid

    def reminders(self, done: bool = False) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT r.*, c.name AS customer_name FROM reminders r "
            "LEFT JOIN customers c ON c.id=r.customer_id "
            "WHERE r.shop_id=? AND r.done=? ORDER BY r.id DESC",
            (SHOP_ID, int(done))).fetchall()

    def reminder_by_token(self, token: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT r.*, c.name AS customer_name FROM reminders r "
            "LEFT JOIN customers c ON c.id=r.customer_id "
            "WHERE r.token=?", (token,)).fetchone()

    def set_reminder_audio(self, reminder_id: int, path: str) -> None:
        self.conn.execute(
            "UPDATE reminders SET audio_path=? WHERE id=?",
            (path, reminder_id))
        self.conn.commit()

    def complete_reminder(self, reminder_id: int) -> bool:
        cur = self.conn.execute(
            "UPDATE reminders SET done=1 WHERE id=? AND shop_id=?",
            (reminder_id, SHOP_ID))
        self.conn.commit()
        return cur.rowcount > 0

    def shop_row(self) -> sqlite3.Row:
        return self.conn.execute(
            "SELECT * FROM shops WHERE id=?", (SHOP_ID,)).fetchone()

    def shop_by_join_code(self, code: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM shops WHERE join_code=?", (code,)).fetchone()

    # ------------------------------------------------------------- staff
    def staff(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM staff WHERE shop_id=? AND active=1",
            (SHOP_ID,)).fetchall()

    def add_staff(self, name: str, pin: str, role: str = "assistant"):
        self.conn.execute(
            "INSERT OR IGNORE INTO staff (shop_id,name,pin_hash,role) "
            "VALUES (?,?,?,?)",
            (SHOP_ID, name, self._pin_hash(name, pin), role))
        self.conn.commit()

    def staff_login(self, name: str, pin: str) -> int | None:
        row = self.conn.execute(
            "SELECT id,pin_hash FROM staff WHERE shop_id=? AND name=? "
            "AND active=1", (SHOP_ID, name.strip())).fetchone()
        if row and secrets.compare_digest(
                self._pin_hash(name, pin), row["pin_hash"]):
            return row["id"]
        return None

    def _leave_event(self, leave_id: int, actor: str, action: str):
        self.conn.execute(
            "INSERT INTO leave_events (leave_id,actor,action,ts) "
            "VALUES (?,?,?,?)",
            (leave_id, actor, action, time.time()))

    def leave_mark(self, staff_id: int, day: str,
                   marked_by: str = "owner") -> int:
        cur = self.conn.execute(
            "INSERT INTO leave_requests (shop_id,staff_id,day,marked_by,"
            "created) VALUES (?,?,?,?,?)",
            (SHOP_ID, staff_id, day, marked_by, time.time()))
        self._leave_event(cur.lastrowid, marked_by, "marked")
        self.conn.commit()
        return cur.lastrowid

    def leave_respond(self, leave_id: int, staff_id: int,
                      action: str) -> bool:
        """staff accept/dispute — dual approval. Returns False if not
        pending or not their request."""
        cur = self.conn.execute(
            "UPDATE leave_requests SET state=?, decided_at=? "
            "WHERE id=? AND staff_id=? AND state='pending'",
            ("accepted" if action == "accept" else "disputed",
             time.time(), leave_id, staff_id))
        if cur.rowcount:
            self._leave_event(leave_id, f"staff:{staff_id}", action)
            self.conn.commit()
            return True
        return False

    def leave_for_staff(self, staff_id: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM leave_requests WHERE staff_id=? "
            "ORDER BY created DESC", (staff_id,)).fetchall()

    def leave_all(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT l.*, s.name AS staff_name FROM leave_requests l "
            "JOIN staff s ON s.id=l.staff_id WHERE l.shop_id=? "
            "ORDER BY l.created DESC", (SHOP_ID,)).fetchall()

    def leave_events(self, leave_id: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM leave_events WHERE leave_id=? ORDER BY ts",
            (leave_id,)).fetchall()

    # ---------------------------------------------- customer accounts
    @staticmethod
    def _pin_hash(name: str, pin: str) -> str:
        import hashlib
        return hashlib.sha256(
            f"{pin.strip()}:{name.strip().lower()}:bk-cust-v1"
            .encode()).hexdigest()

    def account_login(self, name: str, pin: str) -> int | None:
        """Create-or-login: first use of a name sets its PIN; a wrong
        PIN on an existing name returns None."""
        h = self._pin_hash(name, pin)
        row = self.conn.execute(
            "SELECT id,pin_hash FROM customer_accounts WHERE "
            "name=?", (name.strip(),)).fetchone()
        if row is None:
            cur = self.conn.execute(
                "INSERT INTO customer_accounts (name,pin_hash,created) "
                "VALUES (?,?,?)", (name.strip(), h, time.time()))
            self.conn.commit()
            return cur.lastrowid
        return row["id"] if secrets.compare_digest(
            h, row["pin_hash"]) else None

    def link_customer(self, account_id: int, customer_id: int) -> None:
        self.conn.execute(
            "INSERT OR IGNORE INTO customer_links "
            "(account_id,shop_id,customer_id) VALUES (?,?,?)",
            (account_id, SHOP_ID, customer_id))
        self.conn.commit()

    def account_links(self, account_id: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT l.customer_id, l.shop_id, s.name AS shop_name, "
            "c.name AS customer_name FROM customer_links l "
            "JOIN shops s ON s.id=l.shop_id "
            "JOIN customers c ON c.id=l.customer_id "
            "WHERE l.account_id=?", (account_id,)).fetchall()

    def _account_cids(self, account_id: int) -> list[int]:
        return [r["customer_id"] for r in self.account_links(account_id)]

    def account_ledger(self, account_id: int,
                       limit: int = 100) -> list[sqlite3.Row]:
        cids = self._account_cids(account_id)
        if not cids:
            return []
        ph = ",".join("?" for _ in cids)
        return self.conn.execute(
            f"SELECT t.id,t.kind,t.amount_paise,t.ts,t.confirm_state,"
            f"t.payment_method,t.customer_id,s.name AS shop_name "
            f"FROM transactions t JOIN shops s ON s.id=t.shop_id "
            f"WHERE t.customer_id IN ({ph}) AND t.status='ok' "
            f"AND t.kind IN ('sale','credit_sale','payment') "
            f"ORDER BY t.ts DESC LIMIT ?",
            (*cids, limit)).fetchall()

    def account_pending(self, account_id: int) -> list[sqlite3.Row]:
        cids = self._account_cids(account_id)
        if not cids:
            return []
        ph = ",".join("?" for _ in cids)
        return self.conn.execute(
            f"SELECT t.*, s.name AS shop_name FROM transactions t "
            f"JOIN shops s ON s.id=t.shop_id "
            f"WHERE t.customer_id IN ({ph}) "
            f"AND t.confirm_state='pending' ORDER BY t.ts DESC",
            (*cids,)).fetchall()

    def account_reminders(self, account_id: int) -> list[sqlite3.Row]:
        cids = self._account_cids(account_id)
        if not cids:
            return []
        ph = ",".join("?" for _ in cids)
        return self.conn.execute(
            f"SELECT * FROM reminders WHERE customer_id IN ({ph}) "
            f"AND kind='voice_note' AND done=0 ORDER BY id DESC",
            (*cids,)).fetchall()

    def account_expenses(self, account_id: int) -> dict:
        cids = self._account_cids(account_id)
        if not cids:
            return {"by_day": [], "by_month": [], "by_shop": []}
        ph = ",".join("?" for _ in cids)
        from datetime import datetime
        def agg(expr):
            return [dict(r) for r in self.conn.execute(
                f"SELECT {expr} AS k, SUM(amount_paise) AS total,"
                f"COUNT(*) AS n FROM transactions "
                f"WHERE customer_id IN ({ph}) AND status='ok' "
                f"AND kind IN ('sale','credit_sale') "
                f"GROUP BY k ORDER BY k", (*cids,)).fetchall()]
        # SQLite ts is epoch float → date strings via datetime in python
        rows = self.conn.execute(
            f"SELECT ts, amount_paise, shop_id FROM transactions "
            f"WHERE customer_id IN ({ph}) AND status='ok' "
            f"AND kind IN ('sale','credit_sale')", (*cids,)).fetchall()
        by_day: dict[str, int] = {}
        by_month: dict[str, int] = {}
        by_shop: dict[int, int] = {}
        for r in rows:
            d = datetime.fromtimestamp(r["ts"])
            by_day[d.strftime("%Y-%m-%d")] = \
                by_day.get(d.strftime("%Y-%m-%d"), 0) + r["amount_paise"]
            by_month[d.strftime("%Y-%m")] = \
                by_month.get(d.strftime("%Y-%m"), 0) + r["amount_paise"]
            by_shop[r["shop_id"]] = \
                by_shop.get(r["shop_id"], 0) + r["amount_paise"]
        shop_names = {r["shop_id"]: r["shop_name"]
                      for r in self.account_links(account_id)}
        return {
            "by_day": [{"k": k, "total": v} for k, v in
                       sorted(by_day.items())[-30:]],
            "by_month": [{"k": k, "total": v} for k, v in
                         sorted(by_month.items())[-12:]],
            "by_shop": [{"k": shop_names.get(k, str(k)), "total": v}
                        for k, v in sorted(by_shop.items())],
        }

    # --------------------------------------------------------- delivery
    def subscriptions(self, active_only: bool = True) -> list[sqlite3.Row]:
        q = ("SELECT s.*, c.name AS customer_name, p.name_en AS product "
             "FROM subscriptions s JOIN customers c ON c.id=s.customer_id "
             "JOIN products p ON p.id=s.product_id WHERE s.shop_id=?")
        if active_only:
            q += " AND s.active=1"
        return self.conn.execute(q, (SHOP_ID,)).fetchall()

    def add_subscription(self, customer_id: int, product_id: int,
                         qty_per_day: float, unit: str,
                         price_paise: int) -> int:
        cur = self.conn.execute(
            "INSERT INTO subscriptions (shop_id,customer_id,product_id,"
            "qty_per_day,unit,price_paise) VALUES (?,?,?,?,?,?)",
            (SHOP_ID, customer_id, product_id, qty_per_day, unit,
             price_paise))
        self.conn.commit()
        return cur.lastrowid

    def add_skips(self, subscription_id: int, days: list[str]) -> int:
        n = 0
        for d in days:
            cur = self.conn.execute(
                "INSERT OR IGNORE INTO delivery_skips "
                "(shop_id,subscription_id,day) VALUES (?,?,?)",
                (SHOP_ID, subscription_id, d))
            n += cur.rowcount
        self.conn.commit()
        return n

    def skips_for(self, subscription_id: int,
                  month: str | None = None) -> list[str]:
        q = ("SELECT day FROM delivery_skips WHERE subscription_id=?")
        args: tuple = (subscription_id,)
        if month:
            q += " AND day LIKE ?"
            args = (subscription_id, month + "%")
        return [r["day"] for r in
                self.conn.execute(q, args).fetchall()]

    def month_bill(self, subscription_id: int,
                   month: str | None = None) -> dict:
        """Delivery billing: qty/day x (days_in_month - skipped_days)."""
        import calendar
        from datetime import date
        today = date.today()
        y, m = (today.year, today.month) if not month else \
            tuple(int(x) for x in month.split("-")[:2])
        dim = calendar.monthrange(y, m)[1]
        # milkman-style: bill projects the full month minus skipped days,
        # so a future skip shows in the estimate immediately
        sub = self.conn.execute(
            "SELECT * FROM subscriptions WHERE id=?",
            (subscription_id,)).fetchone()
        if sub is None:
            return {}
        skipped = self.skips_for(
            subscription_id, f"{y:04d}-{m:02d}")
        billable = dim - len(skipped)
        per_day = int(round(sub["qty_per_day"] * sub["price_paise"]))
        return {"customer_name": "", "product": "",
                "month": f"{y:04d}-{m:02d}", "days_billed": billable,
                "days_skipped": len(skipped), "skipped": skipped,
                "qty_per_day": sub["qty_per_day"],
                "per_day_paise": per_day,
                "total_paise": billable * per_day}

    # ------------------------------------------------------------ queries
    def recent(self, limit: int = 30) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT t.*, c.name AS customer_name FROM transactions t "
            "LEFT JOIN customers c ON c.id=t.customer_id "
            "WHERE t.shop_id=? AND t.status='ok' "
            "ORDER BY t.ts DESC LIMIT ?", (SHOP_ID, limit)).fetchall()

    def txn_items(self, txn_id: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM txn_items WHERE txn_id=?", (txn_id,)).fetchall()

    def bill_of(self, txn_id: int) -> dict | None:
        t = self.conn.execute(
            "SELECT t.*, c.name AS customer_name FROM transactions t "
            "LEFT JOIN customers c ON c.id=t.customer_id WHERE t.id=?",
            (txn_id,)).fetchone()
        if not t:
            return None
        return {"txn": dict(t), "items": [dict(i) for i in
                                          self.txn_items(txn_id)]}

    def sales_history(self, product_id: int, days: int = 14) -> float:
        """Units sold in the last N days, in the product's stock unit."""
        cutoff = time.time() - days * 86400
        rows = self.conn.execute(
            "SELECT i.qty, i.unit FROM txn_items i "
            "JOIN transactions t ON t.id=i.txn_id "
            "WHERE i.product_id=? AND t.kind IN ('sale','credit_sale') "
            "AND t.status='ok' AND t.ts>=?", (product_id, cutoff)).fetchall()
        return sum(self._stock_qty(float(r["qty"] or 0), r["unit"] or "",
                                   product_id) for r in rows)

    def daily_summary(self, day_offset: int = 0) -> dict:
        lo = time.time() - (day_offset + 1) * 86400
        hi = lo + 86400
        rows = self.conn.execute(
            "SELECT kind, COALESCE(SUM(amount_paise),0) AS amt, COUNT(*) AS n "
            "FROM transactions WHERE shop_id=? AND status='ok' "
            "AND ts BETWEEN ? AND ? GROUP BY kind",
            (SHOP_ID, lo, hi)).fetchall()
        return {r["kind"]: {"amount_paise": r["amt"], "count": r["n"]}
                for r in rows}

    def weekly_insights(self, days: int = 7) -> dict:
        """Top sellers, run-out estimates, top debtors — all from DB."""
        lo = time.time() - days * 86400
        top = self.conn.execute(
            "SELECT ti.name, SUM(ti.qty) AS qty, "
            "SUM(ti.qty*ti.unit_price_paise) AS rev FROM txn_items ti "
            "JOIN transactions t ON t.id=ti.txn_id "
            "WHERE t.shop_id=? AND t.status='ok' AND t.ts>=? "
            "AND t.kind IN ('sale','credit_sale') "
            "GROUP BY ti.name ORDER BY rev DESC LIMIT 3",
            (SHOP_ID, lo)).fetchall()
        # days-of-stock-left from trailing 14d velocity
        lo14 = time.time() - 14 * 86400
        vel = self.conn.execute(
            "SELECT ti.product_id, SUM(ti.qty) AS sold FROM txn_items ti "
            "JOIN transactions t ON t.id=ti.txn_id "
            "WHERE t.shop_id=? AND t.status='ok' AND t.ts>=? "
            "AND t.kind IN ('sale','credit_sale') GROUP BY ti.product_id",
            (SHOP_ID, lo14)).fetchall()
        running_out = []
        for v in vel:
            p = self.conn.execute(
                "SELECT name_en,stock FROM products WHERE id=?",
                (v["product_id"],)).fetchone()
            per_day = v["sold"] / 14.0
            if p and per_day > 0:
                left = p["stock"] / per_day
                if left < 7:
                    running_out.append({"name": p["name_en"],
                                        "days_left": round(left, 1)})
        running_out.sort(key=lambda x: x["days_left"])
        debtors = self.conn.execute(
            "SELECT c.name, SUM(CASE WHEN t.kind='credit_sale' "
            "THEN t.amount_paise WHEN t.kind='payment' "
            "THEN -t.amount_paise ELSE 0 END) AS bal "
            "FROM transactions t JOIN customers c ON c.id=t.customer_id "
            "WHERE t.shop_id=? AND t.status='ok' GROUP BY c.id "
            "HAVING bal>0 ORDER BY bal DESC LIMIT 3",
            (SHOP_ID,)).fetchall()
        return {"days": days,
                "top_sellers": [dict(r) for r in top],
                "running_out": running_out[:3],
                "top_debtors": [{"name": r["name"],
                                 "balance_paise": int(r["bal"])}
                                for r in debtors]}

    # ------------------------------------------------------- confirmations
    def confirm_by_token(self, token: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT t.*, c.name AS customer_name FROM transactions t "
            "LEFT JOIN customers c ON c.id=t.customer_id "
            "WHERE confirm_token=?", (token,)).fetchone()

    def set_confirm_state(self, token: str, state: str) -> bool:
        cur = self.conn.execute(
            "UPDATE transactions SET confirm_state=? WHERE confirm_token=? "
            "AND confirm_state='pending'", (state, token))
        self.conn.commit()
        return cur.rowcount > 0

    def pending_confirmations(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT t.*, c.name AS customer_name FROM transactions t "
            "LEFT JOIN customers c ON c.id=t.customer_id "
            "WHERE t.confirm_state='pending' AND t.shop_id=? "
            "ORDER BY t.ts DESC", (SHOP_ID,)).fetchall()

    # ---------------------------------------------------------------- undo
    def _audit(self, action: str, txn_id: int | None,
               payload: dict[str, Any], actor: str = "owner") -> None:
        self.conn.execute(
            "INSERT INTO audit_log (shop_id,ts,actor,action,txn_id,payload) "
            "VALUES (?,?,?,?,?,?)",
            (SHOP_ID, time.time(), actor, action, txn_id,
             json.dumps(payload, ensure_ascii=False)))
        self.conn.commit()

    def propose(self, payload: dict[str, Any]) -> int:
        """bolta.actions.apply() compat — log a proposed action."""
        cur = self.conn.execute(
            "INSERT INTO audit_log (shop_id,ts,actor,action,txn_id,payload) "
            "VALUES (?,?,?,?,?,?)",
            (SHOP_ID, time.time(), "owner", "propose", -1,
             json.dumps(payload, ensure_ascii=False)))
        self.conn.commit()
        return cur.lastrowid

    def mark_confirmed(self, audit_id: int, txn_id: int) -> None:
        self._audit("confirm", txn_id, {"propose_id": audit_id})

    def mark_denied(self, audit_id: int) -> None:
        self._audit("deny", None, {"propose_id": audit_id})

    def undo_last(self) -> sqlite3.Row | None:
        """Reverse the most recent ok txn: mark undone, restore stock."""
        row = self.conn.execute(
            "SELECT * FROM transactions WHERE status='ok' AND shop_id=? "
            "ORDER BY ts DESC LIMIT 1", (SHOP_ID,)).fetchone()
        if row is None:
            return None
        self.conn.execute(
            "UPDATE transactions SET status='undone' WHERE id=?",
            (row["id"],))
        if row["kind"] in ("sale", "credit_sale", "purchase"):
            sign = 1 if row["kind"] in ("sale", "credit_sale") else -1
            for item in self.txn_items(row["id"]):
                if item["product_id"] and item["qty"]:
                    self.conn.execute(
                        "UPDATE products SET stock = stock + ? WHERE id=?",
                        (sign * self._stock_qty(
                            float(item["qty"]), item["unit"] or "",
                            item["product_id"]), item["product_id"]))
        self.conn.commit()
        self._audit("undo", row["id"], dict(row))
        return row

    # -------------------------------------------------------------- other
    def keyterms(self, limit: int = 180) -> list[str]:
        """Catalog + customer names for Prisma v3.0 keyterms biasing."""
        terms: list[str] = []
        for r in self.products() + self.customers():
            terms.append(r["name_en"] if "name_en" in r.keys() else r["name"])
            for a in (r["aliases"] or "").split(",")[:3]:
                a = a.strip()
                if a and len(terms) < limit:
                    terms.append(a)
            if len(terms) >= limit:
                break
        return terms[:limit]

    def log_api_call(self, service: str, ms: int, ok: bool,
                     cached: bool = False) -> None:
        self.conn.execute(
            "INSERT INTO api_call_log (ts,service,ms,ok,cached) "
            "VALUES (?,?,?,?,?)",
            (time.time(), service, ms, int(ok), int(cached)))
        self.conn.commit()

    def seed_if_empty(self, seed_fn) -> None:
        if not self.products():
            seed_fn(self)
