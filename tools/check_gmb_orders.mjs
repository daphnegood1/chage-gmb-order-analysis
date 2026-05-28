import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userDataDir = path.join(root, ".chrome-gmb-profile");
const port = 9223;
const dataPath = path.join(root, "data", "stores.json");
const csvPath = path.join(root, "data", "stores.csv");
let debugDialogs = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}, timeoutMs = 25000) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function startChrome() {
  if (!existsSync(chromePath)) {
    throw new Error(`Chrome not found: ${chromePath}`);
  }
  await mkdir(userDataDir, { recursive: true });
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-popup-blocking",
    "--disable-features=Translate",
    "--window-size=1280,1000",
    "about:blank",
  ], { detached: true, stdio: "ignore" });
  chrome.unref();

  for (let i = 0; i < 40; i += 1) {
    try {
      await fetchJson(`http://127.0.0.1:${port}/json/version`);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("Chrome CDP did not start");
}

async function connectTab() {
  let targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  let target = targets.find((item) => item.type === "page");
  if (!target) {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
    if (!response.ok) throw new Error(`Cannot create tab: ${response.status}`);
    target = await response.json();
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const cdp = new Cdp(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  return cdp;
}

async function evaluate(cdp, expression, timeout = 30000) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function navigate(cdp, url) {
  console.log(`  navigate ${url}`);
  await cdp.send("Page.navigate", { url });
  await sleep(5000);
}

function queryForStore(store) {
  return encodeURIComponent(`茶聚CHAGE${store.official_name} ${store.address || ""}`.trim());
}

function normalizeProvider(raw) {
  const text = String(raw || "").trim();
  const lower = text.toLowerCase();
  if (!text) return "";
  if (lower.includes("foodpanda")) return "foodpanda";
  if (lower.includes("uber") || lower.includes("ubereats")) return "Uber Eats";
  if (lower.includes("lin.ee") || lower === "line" || lower.includes("line")) return "lin.ee";
  return text.replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values.map(normalizeProvider).filter(Boolean))];
}

async function pageSnapshot(cdp) {
  return evaluate(cdp, `(() => {
    const nodes = Array.from(document.querySelectorAll('a, button, div[role="button"], span, div')).slice(0, 2000);
    const items = nodes.map((node, index) => ({
      index,
      tag: node.tagName,
      role: node.getAttribute('role') || '',
      text: (node.innerText || node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 160),
      aria: (node.getAttribute('aria-label') || '').trim(),
      href: node.href || ''
    })).filter(item => item.text || item.aria || item.href);
    return { title: document.title, url: location.href, body: document.body ? document.body.innerText.slice(0, 6000) : '', items };
  })()`);
}

async function clickByText(cdp, patterns) {
  return evaluate(cdp, `(async () => {
    const patterns = ${JSON.stringify(patterns)};
    const els = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const match = els.find((el) => {
      const text = ((el.innerText || el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).trim();
      return patterns.some((pattern) => text.includes(pattern));
    });
    if (!match) return false;
    match.scrollIntoView({ block: 'center', inline: 'center' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    match.click();
    return true;
  })()`);
}

async function closeDialog(cdp) {
  await evaluate(cdp, `(() => {
    const labels = ['關閉', 'Close', '返回'];
    const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const target = els.find((el) => labels.some((label) => ((el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '')).includes(label)));
    if (target) target.click();
    return Boolean(target);
  })()`).catch(() => false);
  await sleep(800);
}

async function extractProvidersFromDialog(cdp, debugName = "") {
  const dialogInfo = await evaluate(cdp, `(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 40 && rect.height > 20;
    };
    const nodes = Array.from(document.querySelectorAll('div, section, aside, dialog, [role="dialog"], [aria-modal="true"]'))
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
        return { text, area: rect.width * rect.height };
      })
      .filter((item) => item.text.includes('選擇下單對象') || /foodpanda|Uber\\s*Eats|UberEats|lin\\.ee/i.test(item.text))
      .sort((a, b) => a.area - b.area);
    const best = nodes.find((item) => item.text.includes('選擇下單對象') && /foodpanda|Uber\\s*Eats|UberEats|lin\\.ee/i.test(item.text))
      || nodes.find((item) => /foodpanda|Uber\\s*Eats|UberEats|lin\\.ee/i.test(item.text))
      || nodes.find((item) => item.text.includes('選擇下單對象'))
      || { text: document.body ? document.body.innerText : '' };
    return { best: best.text, candidates: nodes.slice(0, 25) };
  })()`);
  if (debugName) {
    await mkdir(path.join(root, "debug"), { recursive: true });
    await writeFile(path.join(root, "debug", `${debugName}.json`), JSON.stringify(dialogInfo, null, 2), "utf8");
  }
  const dialogText = dialogInfo.best || "";
  const text = dialogText || "";
  const providers = [];
  if (/foodpanda/i.test(text)) providers.push("foodpanda");
  if (/Uber\s*Eats|UberEats|ubereats/i.test(text)) providers.push("Uber Eats");
  if (/lin\.ee|line/i.test(text)) providers.push("lin.ee");
  return unique(providers);
}

async function checkStore(cdp, store) {
  const url = `https://www.google.com/search?hl=zh-TW&gl=tw&q=${queryForStore(store)}`;
  await navigate(cdp, url);
  let snapshot = await pageSnapshot(cdp);
  const body = snapshot.body || "";
  const hasBusinessSignal = body.includes(store.official_name.replace("店", "")) || body.includes("茶聚") || body.includes(store.address || "___");
  const hasClosedSignal = /永久停業|已歇業|關閉/.test(body);

  let takeoutClicked = await clickByText(cdp, ["點餐外帶", "Order pickup"]);
  if (!takeoutClicked) {
    await navigate(cdp, `https://www.google.com/maps/search/?api=1&hl=zh-TW&gl=tw&query=${queryForStore(store)}`);
    snapshot = await pageSnapshot(cdp);
    takeoutClicked = await clickByText(cdp, ["點餐外帶", "Order pickup"]);
  }
  let takeoutProviders = [];
  if (takeoutClicked) {
    await sleep(1600);
    const debugPrefix = debugDialogs ? store.official_name.replace(/[^\p{L}\p{N}]+/gu, "_") : "";
    takeoutProviders = await extractProvidersFromDialog(cdp, debugPrefix ? `${debugPrefix}-takeout` : "");
    await closeDialog(cdp);
  }

  const deliveryClicked = await clickByText(cdp, ["點餐外送", "Order delivery"]);
  let deliveryProviders = [];
  if (deliveryClicked) {
    await sleep(1600);
    const debugPrefix = debugDialogs ? store.official_name.replace(/[^\p{L}\p{N}]+/gu, "_") : "";
    deliveryProviders = await extractProvidersFromDialog(cdp, debugPrefix ? `${debugPrefix}-delivery` : "");
    await closeDialog(cdp);
  }

  snapshot = await pageSnapshot(cdp);
  return {
    gmb_name: "",
    gmb_url: snapshot.url || url,
    gmb_status: hasClosedSignal ? "歇業或異常" : hasBusinessSignal ? "已自動查核" : "無法確認",
    has_takeout_order: takeoutClicked ? true : false,
    has_delivery_order: deliveryClicked ? true : false,
    takeout_providers: takeoutProviders,
    delivery_providers: deliveryProviders,
    other_providers: unique([...takeoutProviders, ...deliveryProviders].filter((provider) => provider !== "foodpanda" && provider !== "Uber Eats")),
    verification_note: takeoutClicked || deliveryClicked
      ? "以 Chrome 自動化開啟 Google Maps 商家檔案並讀取點餐彈窗。"
      : "Chrome 自動化未找到可點擊的點餐外帶/外送按鈕；需人工複查。",
    verified_at: new Date().toISOString().slice(0, 10),
  };
}

function toCsvValue(value) {
  if (Array.isArray(value)) value = value.join("、");
  if (value === null || value === undefined) value = "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeStores(payload) {
  await writeFile(dataPath, JSON.stringify(payload, null, 2), "utf8");
  const fields = [
    "official_id", "official_name", "city_group", "address", "phone", "hours",
    "official_url", "gmb_name", "gmb_url", "gmb_status", "has_takeout_order",
    "has_delivery_order", "takeout_providers", "delivery_providers",
    "other_providers", "verification_note", "verified_at",
  ];
  const rows = [fields.join(",")];
  for (const store of payload.stores) {
    rows.push(fields.map((field) => toCsvValue(store[field])).join(","));
  }
  await writeFile(csvPath, `\ufeff${rows.join("\n")}\n`, "utf8");
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const resume = process.argv.includes("--resume");
  debugDialogs = process.argv.includes("--debug");
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
  const only = onlyArg ? onlyArg.split("=")[1] : "";

  await startChrome();
  const cdp = await connectTab();
  const payload = JSON.parse(await readFile(dataPath, "utf8"));
  let checked = 0;
  for (const store of payload.stores) {
    if (only && !store.official_name.includes(only)) continue;
    if (resume && store.verified_at) continue;
    if (checked >= limit) break;
    console.log(`Checking ${store.official_name}`);
    try {
      const result = await checkStore(cdp, store);
      Object.assign(store, result);
      console.log(`  takeout=${store.has_takeout_order} ${store.takeout_providers.join("|")} delivery=${store.has_delivery_order} ${store.delivery_providers.join("|")}`);
    } catch (error) {
      store.gmb_status = "無法確認";
      store.verification_note = `Chrome 自動化查核失敗：${error.message.slice(0, 180)}`;
      store.verified_at = new Date().toISOString().slice(0, 10);
      console.log(`  failed: ${error.message}`);
    }
    checked += 1;
    await writeStores(payload);
    await sleep(600);
  }
  payload.generated_at = new Date().toISOString().slice(0, 10);
  await writeStores(payload);
  await cdp.ws?.close?.();
  console.log(`Done. Checked ${checked} stores.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
