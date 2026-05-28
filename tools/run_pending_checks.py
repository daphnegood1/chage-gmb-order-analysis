from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "stores.json"
NODE = r"C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"


def kill_automation_chrome() -> None:
    command = (
        "Get-CimInstance Win32_Process -Filter \"name = 'chrome.exe'\" | "
        "Where-Object { $_.CommandLine -like '*.chrome-gmb-profile*' } | "
        "ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", command], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def pending_names() -> list[str]:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    names = []
    for store in payload["stores"]:
        if not store.get("verified_at") or store.get("gmb_status") == "無法確認":
            names.append(store["official_name"])
    return names


def main() -> int:
    names = pending_names()
    print(f"Pending stores: {len(names)}", flush=True)
    for index, name in enumerate(names, 1):
        print(f"[{index}/{len(names)}] {name}", flush=True)
        kill_automation_chrome()
        result = subprocess.run(
            [NODE, "tools/check_gmb_orders.mjs", f"--only={name}"],
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=90,
        )
        print(result.stdout[-1200:], flush=True)
    kill_automation_chrome()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
