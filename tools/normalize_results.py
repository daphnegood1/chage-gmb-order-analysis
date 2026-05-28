from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "stores.json"
CSV = ROOT / "data" / "stores.csv"


def write_csv(stores: list[dict]) -> None:
    fields = [
        "official_id",
        "official_name",
        "city_group",
        "address",
        "phone",
        "hours",
        "official_url",
        "gmb_name",
        "gmb_url",
        "gmb_status",
        "has_takeout_order",
        "has_delivery_order",
        "takeout_providers",
        "delivery_providers",
        "other_providers",
        "verification_note",
        "verified_at",
    ]
    with CSV.open("w", encoding="utf-8-sig", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        for store in stores:
            row = dict(store)
            for key in ("takeout_providers", "delivery_providers", "other_providers"):
                row[key] = "、".join(row.get(key) or [])
            writer.writerow({field: row.get(field, "") for field in fields})


payload = json.loads(DATA.read_text(encoding="utf-8"))
for store in payload["stores"]:
    takeout = store.get("has_takeout_order")
    delivery = store.get("has_delivery_order")
    has_result = isinstance(takeout, bool) and isinstance(delivery, bool)
    if has_result:
        store["gmb_status"] = "已自動查核"
        if not takeout and not delivery:
            store["verification_note"] = "以 Chrome 自動化查核 Google 搜尋與 Maps；未見「點餐外帶」或「點餐外送」按鈕。"
        elif not (store.get("takeout_providers") or store.get("delivery_providers")):
            store["verification_note"] = "以 Chrome 自動化找到點餐按鈕，但彈窗未顯示可辨識的服務商名稱。"

    providers = set((store.get("takeout_providers") or []) + (store.get("delivery_providers") or []))
    store["other_providers"] = sorted(provider for provider in providers if provider not in {"foodpanda", "Uber Eats"})

DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
write_csv(payload["stores"])
