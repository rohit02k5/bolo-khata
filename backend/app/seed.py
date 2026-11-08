"""Synthetic seed for the demo shop — adapted from NoiseLab's bolta/seed.

Products carry real prices now (price_paise per product.unit). Customer
names are synthetic first names only; no real people, per contest rules.
Sales history seeds transactions + txn_items so queries/reorder have data.
"""

from __future__ import annotations

import time

import numpy as np

# (name_en, name_hi, name_te, aliases csv, unit, pack, stock, reorder_pt,
#  price_paise per unit, avg_daily_units)
PRODUCTS = [
    ("Maggi", "मैगी", "మ్యాగీ", "maggi,megi,maggi noodles,मैगी नूडल्स,మ్యాగీ నూడిల్స్", "packet", 12, 60, 24, 1400, 8),
    ("Aata", "आटा", "గోధుమ పిండి", "aata,atta,wheat flour,गेहूं आटा,గోధుమ పిండి,gehu,गेहूं,gehun", "kg", 1, 30, 10, 5500, 3),
    ("Chawal", "चावल", "బియ్యం", "chawal,chaval,rice,बासमती,రైస్,బియ్యం,biyyam", "kg", 1, 40, 15, 7000, 4),
    ("Daal", "दाल", "పప్పు", "daal,dal,toor dal,arhar,अरहर,పప్పు,pappu", "kg", 1, 20, 8, 14000, 2),
    ("Chini", "चीनी", "చక్కెర", "chini,cheeni,sugar,चीनी,చక్కెర,chakker,chakkera,పంచదార,panchadara", "kg", 1, 25, 10, 4500, 2),
    ("Tel", "तेल", "నూనె", "tel,oil,refined oil,sarso,నూనె,noone", "liter", 1, 15, 6, 18000, 1),
    ("Coke", "कोक", "కోక్", "coke,coca cola,cola,कोका कोला,కోక్", "bottle", 12, 36, 12, 4000, 5),
    ("Parle-G", "पारले जी", "బిస్కెట్", "parle,parle g,parle-g,parleji,biscuit,బిస్కెట్,bisket", "packet", 12, 80, 24, 1000, 10),
    ("Doodh", "दूध", "పాలు", "doodh,dudh,milk,amul milk,పాలు,మిల్క్,paalu", "packet", 1, 20, 10, 2700, 12),
    ("Dahi", "दही", "పెరుగు", "dahi,curd,amul dahi,పెరుగు,perugu", "cup", 1, 15, 6, 3000, 4),
    ("Sabun", "साबुन", "సబ్బు", "sabun,soap,lux,dettol soap,సబ్బు", "piece", 4, 20, 8, 3500, 2),
    ("Shampoo", "शैम्पू", "షాంపూ", "shampoo,clinic plus,sachet,షాంపూ", "sachet", 16, 50, 16, 200, 6),
    ("Anda", "अंडा", "గుడ్లు", "anda,eggs,egg,अंडे,గుడ్లు,gudlu", "dozen", 1, 6, 4, 7800, 2),
    ("Pav", "पाव", "బ్రెడ్", "pav,bread,pav bread,bun,బ్రెడ్,bread", "piece", 4, 16, 8, 1200, 6),
    ("Chai Patti", "चाय पत्ती", "టీ పత్రి", "chai,tea,chai patti,tata tea,red label,టీ", "packet", 1, 12, 5, 15000, 1),
    ("Namkeen", "नमकीन", "నమ్కీన్", "namkeen,bhujia,haldiram", "packet", 6, 30, 12, 2000, 4),
    ("Matchbox", "माचिस", "అగ్గిపెట్టె", "matchbox,machis,diye", "box", 10, 40, 10, 200, 2),
    ("Surf", "सर्फ", "సర్ఫ్", "surf,surf excel,detergent,washing powder", "packet", 6, 18, 6, 11500, 1),
    ("Toothpaste", "टूथपेस्ट", "టూత్ పేస్ట్", "toothpaste,colgate,pepsodent,paste", "piece", 6, 18, 6, 10000, 1),
    ("Kurkure", "कुरकुरे", "కుర్కురె", "kurkure,chips,lays,snacks", "packet", 12, 48, 12, 2000, 5),
    ("Ghee", "घी", "నెయ్యి", "ghee,amul ghee,deshi ghee,neyyi", "dabba", 1, 8, 3, 65000, 0.5),
    ("Besan", "बेसन", "శనగ పిండి", "besan,gram flour,chana flour", "kg", 1, 10, 4, 8000, 1),
    ("Masala", "मसाला", "మసాలా", "masala,spices,haldi,mirchi powder", "packet", 1, 25, 10, 5000, 3),
    ("Maggi Sauce", "सॉस", "సాస్", "sauce,tomato sauce,maggi sauce,ketchup", "bottle", 1, 10, 4, 13000, 0.5),
    ("Akhbar", "अख़बार", "పేపర్", "akhbar,akhbaar,newspaper,paper,dainik,दैनिक,वार्ता,వార్తాపత్రిక,news", "piece", 1, 30, 10, 600, 3),
]

# customer name -> (product, qty/day, unit) daily-delivery subscriptions
SUBSCRIPTIONS = [
    ("Ramesh", "Doodh", 1.0, "packet"),
    ("Lakshmi", "Doodh", 2.0, "packet"),
    ("Suresh", "Akhbar", 1.0, "piece"),
]

CUSTOMERS = [
    ("Rahul", "rahul,राहुल,rahul sharma,రాహుల్"),
    ("Sunita", "sunita,सुनीता,sunita devi,సునీత"),
    ("Ramesh", "ramesh,रमेश,ramesh bhai,రమేష్,rames"),
    ("Lakshmi", "lakshmi,लक्ष्मी,laxmi,లక్ష్మీ"),
    ("Kaka", "kaka,काका,kaka ji,కాకా"),
    ("Priya", "priya,प्रिया,ప్రియా"),
    ("Mohan", "mohan,मोहन,mohan lal,మోహన్"),
    ("Geeta", "geeta,गीता,gita,గీత"),
    ("Vijay", "vijay,विजय,vijay bhai,విజయ్"),
    ("Fatima", "fatima,फातिमा,fatima begum,ఫాతిమా"),
    ("Suresh", "suresh,सुरेश,సురేష్"),
    ("Anita", "anita,अनीता,anita aunty,అనిత"),
]


def seed_subscriptions(db) -> None:
    """Idempotent delivery-subscription backfill (separate from the
    historical-data seed so existing DBs get subs too)."""
    if db.subscriptions():
        return
    for cname, pname, qpd, unit in SUBSCRIPTIONS:
        cust = db.conn.execute(
            "SELECT id FROM customers WHERE name=?", (cname,)).fetchone()
        prod = db.conn.execute(
            "SELECT id FROM products WHERE name_en=?", (pname,)).fetchone()
        if cust is None or prod is None:
            continue
        db.add_subscription(cust["id"], prod["id"], qpd, unit,
                            db.price_paise(prod["id"]))


def seed(db, *, days: int = 60, rng_seed: int = 42) -> None:
    if db.products():
        seed_subscriptions(db)
        return
    g = np.random.default_rng(rng_seed)
    prod_ids = {}
    for (en, hi, te, aliases, unit, pack, stock, rp, price, avg) in PRODUCTS:
        pid = db.add_product(en, hi, te, aliases=aliases, unit=unit,
                             pack_size=pack, price_paise=price, stock=stock,
                             reorder_point=rp)
        prod_ids[en] = pid
    cust_ids = [db.add_customer(n, aliases=a) for n, a in CUSTOMERS]
    name_to_cid = {n: cid for (n, _), cid in zip(CUSTOMERS, cust_ids)}
    for cname, pname, qpd, unit in SUBSCRIPTIONS:
        db.add_subscription(name_to_cid[cname], prod_ids[pname],
                            qpd, unit,
                            db.price_paise(prod_ids[pname]))

    now = time.time()
    for (en, _hi, _te, _al, unit, _pack, _st, _rp, price, avg) in PRODUCTS:
        pid = prod_ids[en]
        for d in range(days, 0, -1):
            dow = time.localtime(now - d * 86400).tm_wday
            lam = avg * (1.35 if dow >= 5 else 1.0)
            units = int(g.poisson(lam))
            if units <= 0:
                continue
            credit = g.random() < 0.15
            cid = int(cust_ids[g.integers(0, len(cust_ids))]) if credit else None
            tid = db._txn(
                "credit_sale" if credit else "sale",
                customer_id=cid, amount_paise=int(units * price),
                source="seed",
                payment_method="khata" if credit else "cash",
                confirm_state="confirmed" if credit else "none")
            db.conn.execute(
                "INSERT INTO txn_items (txn_id,product_id,name,qty,unit,"
                "unit_price_paise) VALUES (?,?,?,?,?,?)",
                (tid, pid, en, float(units), unit, price))
            # backdate the seeded txn
            db.conn.execute("UPDATE transactions SET ts=? WHERE id=?",
                            (now - d * 86400 - float(g.integers(0, 43200)),
                             tid))
        db.conn.commit()

    for cid in cust_ids[:6]:
        amt = int(g.integers(1, 30)) * 10000
        db._txn("credit_sale", customer_id=cid, amount_paise=amt,
                note="seed udhaar", source="seed", payment_method="khata",
                confirm_state="confirmed")
        if g.random() < 0.5:
            db._txn("payment", customer_id=cid,
                    amount_paise=amt // 2, note="seed part-payment",
                    source="seed", payment_method="cash")
