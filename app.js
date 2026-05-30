const state = {
  stores: [],
  filtered: [],
};

const providerColors = {
  foodpanda: "var(--rose)",
  "Uber Eats": "var(--green)",
  "lin.ee": "var(--blue)",
};

const cityLabels = {
  台中門市: "台中市",
  台北門市: "台北市",
  台南門市: "台南市",
  宜蘭門市: "宜蘭縣",
  花蓮門市: "花蓮縣",
  苗栗門市: "苗栗縣",
  桃園門市: "桃園市",
  高雄門市: "高雄市",
  基隆門市: "基隆市",
  新北門市: "新北市",
  新竹門市: "新竹縣市",
  彰化門市: "彰化縣",
};

const countyFallbacks = {
  台中門市: "台中市",
  台北門市: "台北市",
  台南門市: "台南市",
  宜蘭門市: "宜蘭縣",
  花蓮門市: "花蓮縣",
  苗栗門市: "苗栗縣",
  桃園門市: "桃園市",
  高雄門市: "高雄市",
  基隆門市: "基隆市",
  新北門市: "新北市",
  彰化門市: "彰化縣",
};

const countyDefinitions = [
  { name: "台北市", x: 252, y: 82, region: "台北基宜" },
  { name: "新北市", x: 229, y: 110, region: "台北基宜" },
  { name: "基隆市", x: 294, y: 72, region: "台北基宜" },
  { name: "宜蘭縣", x: 288, y: 164, region: "台北基宜" },
  { name: "桃園市", x: 204, y: 145, region: "桃竹苗" },
  { name: "新竹市", x: 164, y: 183, region: "桃竹苗" },
  { name: "新竹縣", x: 206, y: 204, region: "桃竹苗" },
  { name: "苗栗縣", x: 186, y: 252, region: "桃竹苗" },
  { name: "台中市", x: 171, y: 311, region: "中彰投" },
  { name: "彰化縣", x: 136, y: 358, region: "中彰投" },
  { name: "南投縣", x: 215, y: 365, region: "中彰投" },
  { name: "雲林縣", x: 139, y: 411, region: "雲嘉南" },
  { name: "嘉義市", x: 158, y: 454, region: "雲嘉南" },
  { name: "嘉義縣", x: 195, y: 455, region: "雲嘉南" },
  { name: "台南市", x: 151, y: 512, region: "雲嘉南" },
  { name: "高雄市", x: 181, y: 574, region: "高屏" },
  { name: "屏東縣", x: 225, y: 626, region: "高屏" },
  { name: "花蓮縣", x: 286, y: 342, region: "花東" },
  { name: "台東縣", x: 278, y: 523, region: "花東" },
  { name: "澎湖縣", x: 66, y: 456, region: "離島" },
  { name: "金門縣", x: 47, y: 329, region: "離島" },
  { name: "連江縣", x: 68, y: 113, region: "離島" },
];

const regionDefinitions = [
  { name: "台北基宜", counties: ["台北市", "新北市", "基隆市", "宜蘭縣"] },
  { name: "桃竹苗", counties: ["桃園市", "新竹市", "新竹縣", "苗栗縣"] },
  { name: "中彰投", counties: ["台中市", "彰化縣", "南投縣"] },
  { name: "雲嘉南", counties: ["雲林縣", "嘉義市", "嘉義縣", "台南市"] },
  { name: "高屏", counties: ["高雄市", "屏東縣"] },
  { name: "花東", counties: ["花蓮縣", "台東縣"] },
];

const countyCityGroups = {
  台北市: "台北門市",
  新北市: "新北門市",
  基隆市: "基隆門市",
  宜蘭縣: "宜蘭門市",
  桃園市: "桃園門市",
  新竹市: "新竹門市",
  新竹縣: "新竹門市",
  苗栗縣: "苗栗門市",
  台中市: "台中門市",
  彰化縣: "彰化門市",
  台南市: "台南門市",
  高雄市: "高雄門市",
  花蓮縣: "花蓮門市",
};

function cityLabel(value) {
  return cityLabels[value] || value;
}

function normalizeCountyName(value) {
  return value ? value.replaceAll("臺", "台").replace("桃園巿", "桃園市") : "";
}

function countyFromStore(store) {
  const address = normalizeCountyName(store.address || "");
  const match = address.match(
    /(台北市|新北市|基隆市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/
  );
  if (match) return match[1];
  if (store.city_group === "新竹門市") return address.includes("新竹市") ? "新竹市" : "新竹縣";
  return countyFallbacks[store.city_group] || cityLabel(store.city_group);
}

function boolLabel(value) {
  if (value === true) return "有";
  if (value === false) return "無";
  return "待查核";
}

function tagClass(value) {
  if (value === true) return "confirmed";
  if (value === false) return "none";
  return "pending";
}

function providersText(providers) {
  return Array.isArray(providers) && providers.length ? providers.join("、") : "無";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function confirmedStores() {
  return state.stores.filter((store) => store.gmb_status === "已人工確認" || store.gmb_status === "已自動查核");
}

function selectedCity() {
  const globalFilter = document.getElementById("globalCityFilter");
  const tableFilter = document.getElementById("cityFilter");
  return (globalFilter && globalFilter.value) || (tableFilter && tableFilter.value) || "";
}

function scopedStores() {
  const city = selectedCity();
  return city ? state.stores.filter((store) => store.city_group === city) : state.stores;
}

function calculateStats() {
  const stores = scopedStores();
  const storeSet = new Set(stores);
  const confirmed = confirmedStores().filter((store) => storeSet.has(store));
  const takeoutProviderCounts = new Map();
  const deliveryProviderCounts = new Map();

  for (const store of confirmed) {
    for (const provider of unique(store.takeout_providers || [])) {
      takeoutProviderCounts.set(provider, (takeoutProviderCounts.get(provider) || 0) + 1);
    }
    for (const provider of unique(store.delivery_providers || [])) {
      deliveryProviderCounts.set(provider, (deliveryProviderCounts.get(provider) || 0) + 1);
    }
  }

  return {
    total: stores.length,
    confirmed: confirmed.length,
    pending: stores.length - confirmed.length,
    takeout: confirmed.filter((store) => store.has_takeout_order === true).length,
    delivery: confirmed.filter((store) => store.has_delivery_order === true).length,
    takeoutProviderCounts,
    deliveryProviderCounts,
  };
}

function renderMetric(id, value) {
  document.getElementById(id).textContent = value.toLocaleString("zh-Hant");
}

function renderBarChart(node, rows, maxValue) {
  node.innerHTML = "";
  if (!rows.length) {
    node.innerHTML = '<p class="small">尚無已確認資料</p>';
    return;
  }

  for (const row of rows) {
    const width = maxValue > 0 ? Math.max(2, (row.value / maxValue) * 100) : 0;
    const element = document.createElement("div");
    element.className = "bar-row";
    element.innerHTML = `
      <span class="bar-label">${row.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${width}%; background:${row.color || "var(--green)"}"></span></span>
      <span class="bar-value">${row.value}</span>
    `;
    node.appendChild(element);
  }
}

function countStoresByCounty(stores) {
  const counts = new Map(countyDefinitions.map((county) => [county.name, 0]));
  for (const store of stores) {
    const county = countyFromStore(store);
    counts.set(county, (counts.get(county) || 0) + 1);
  }
  return counts;
}

function renderLocationDistribution() {
  const counts = countStoresByCounty(scopedStores());
  const maxCount = Math.max(...countyDefinitions.map((county) => counts.get(county.name) || 0), 0);
  const labels = document.getElementById("countyMapLabels");
  const list = document.getElementById("countyList");
  const summary = document.getElementById("regionSummary");
  labels.innerHTML = "";
  list.innerHTML = "";
  summary.innerHTML = "";

  for (const region of regionDefinitions) {
    const total = region.counties.reduce((sum, county) => sum + (counts.get(county) || 0), 0);
    const item = document.createElement("article");
    item.className = "region-card";
    item.innerHTML = `
      <span>${region.name}</span>
      <strong>${total.toLocaleString("zh-Hant")}</strong>
      <small>${region.counties.join("、")}</small>
    `;
    summary.appendChild(item);
  }

  for (const county of countyDefinitions) {
    const count = counts.get(county.name) || 0;
    const level = count === 0 ? "zero" : count >= maxCount ? "high" : count >= Math.max(2, maxCount * 0.5) ? "mid" : "low";
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `county-marker ${level}`;
    marker.style.left = `${(county.x / 420) * 100}%`;
    marker.style.top = `${(county.y / 720) * 100}%`;
    marker.innerHTML = `<span>${county.name}</span><strong>${count}</strong>`;
    marker.setAttribute("aria-label", `${county.name} ${count} 間`);
    marker.title = `${county.name}：${count} 間`;
    const cityGroup = countyCityGroups[county.name];
    if (cityGroup) {
      marker.addEventListener("click", () => applyCityFilter(cityGroup));
    } else {
      marker.disabled = true;
    }
    labels.appendChild(marker);

    const row = document.createElement("div");
    row.className = "county-list-row";
    row.innerHTML = `<span>${county.name}</span><strong>${count}</strong>`;
    list.appendChild(row);
  }
}

function renderCharts() {
  const stats = calculateStats();
  renderMetric("totalStores", stats.total);
  renderMetric("confirmedStores", stats.confirmed);
  renderMetric("takeoutStores", stats.takeout);
  renderMetric("deliveryStores", stats.delivery);
  renderMetric("pendingStores", stats.pending);

  renderBarChart(
    document.getElementById("orderChart"),
    [
      { label: "點餐外帶", value: stats.takeout, color: "var(--blue)" },
      { label: "點餐外送", value: stats.delivery, color: "var(--green)" },
      { label: "待查核", value: stats.pending, color: "var(--amber)" },
    ],
    Math.max(stats.takeout, stats.delivery, stats.pending)
  );

  const takeoutProviders = [...stats.takeoutProviderCounts.entries()]
    .map(([label, value]) => ({ label, value, color: providerColors[label] || "var(--amber)" }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "zh-Hant"));
  renderBarChart(
    document.getElementById("takeoutProviderChart"),
    takeoutProviders,
    Math.max(...takeoutProviders.map((row) => row.value), 0)
  );

  const deliveryProviders = [...stats.deliveryProviderCounts.entries()]
    .map(([label, value]) => ({ label, value, color: providerColors[label] || "var(--amber)" }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "zh-Hant"));
  renderBarChart(
    document.getElementById("deliveryProviderChart"),
    deliveryProviders,
    Math.max(...deliveryProviders.map((row) => row.value), 0)
  );
  renderLocationDistribution();
}

function fillFilters() {
  const globalCityFilter = document.getElementById("globalCityFilter");
  const cityFilter = document.getElementById("cityFilter");
  const statusFilter = document.getElementById("statusFilter");
  const cityFilters = [globalCityFilter, cityFilter].filter(Boolean);

  for (const city of unique(state.stores.map((store) => store.city_group))) {
    for (const filter of cityFilters) {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = cityLabel(city);
      filter.appendChild(option);
    }
  }

  for (const status of unique(state.stores.map((store) => store.gmb_status))) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    statusFilter.appendChild(option);
  }
}

function matchesFilters(store) {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const city = selectedCity();
  const status = document.getElementById("statusFilter").value;
  const haystack = [
    store.official_name,
    store.gmb_name,
    store.city_group,
    store.address,
    ...(store.takeout_providers || []),
    ...(store.delivery_providers || []),
    ...(store.other_providers || []),
    store.verification_note,
  ]
    .join(" ")
    .toLowerCase();

  return (!query || haystack.includes(query)) && (!city || store.city_group === city) && (!status || store.gmb_status === status);
}

function renderTags(values, fallback = "無") {
  if (!Array.isArray(values) || !values.length) {
    return `<span class="small">${fallback}</span>`;
  }
  return `<span class="tag-list">${values.map((value) => `<span class="tag">${value}</span>`).join("")}</span>`;
}

function renderRows() {
  state.filtered = state.stores.filter(matchesFilters);
  document.getElementById("rowCount").textContent = `${state.filtered.length.toLocaleString("zh-Hant")} 筆資料`;
  const body = document.getElementById("storeRows");
  body.innerHTML = "";

  for (const store of state.filtered) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="store-name">${store.official_name}</div>
        <div class="small">${cityLabel(store.city_group)}</div>
      </td>
      <td>${store.address || '<span class="small">未提供</span>'}</td>
      <td>
        <span class="tag ${store.gmb_status === "已人工確認" ? "confirmed" : "pending"}">${store.gmb_status}</span>
        <div class="small">${store.verification_note || ""}</div>
      </td>
      <td>
        <span class="tag ${tagClass(store.has_takeout_order)}">${boolLabel(store.has_takeout_order)}</span>
        ${renderTags(store.takeout_providers, "待查核")}
      </td>
      <td>
        <span class="tag ${tagClass(store.has_delivery_order)}">${boolLabel(store.has_delivery_order)}</span>
        ${renderTags(store.delivery_providers, "待查核")}
      </td>
      <td>${renderTags(store.other_providers)}</td>
      <td>
        <a href="${store.gmb_url}" target="_blank" rel="noreferrer">GMB</a>
        <span class="small"> / </span>
        <a href="${store.official_url}" target="_blank" rel="noreferrer">官網</a>
      </td>
    `;
    body.appendChild(row);
  }
}

function applyCityFilter(value) {
  for (const id of ["globalCityFilter", "cityFilter"]) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }
  renderCharts();
  renderRows();
}

function bindEvents() {
  for (const id of ["globalCityFilter", "cityFilter"]) {
    document.getElementById(id).addEventListener("input", (event) => applyCityFilter(event.target.value));
  }

  for (const id of ["searchInput", "statusFilter"]) {
    document.getElementById(id).addEventListener("input", renderRows);
  }
}

async function init() {
  const response = await fetch("data/stores.json", { cache: "no-store" });
  const payload = await response.json();
  state.stores = payload.stores || [];
  document.getElementById("updatedAt").textContent = `資料更新：${payload.generated_at || "未標示"}`;
  fillFilters();
  renderCharts();
  renderRows();
  bindEvents();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("rowCount").textContent = "資料載入失敗";
});
