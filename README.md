# 茶聚 GMB 點餐服務統計

這個專案用來整理台灣茶聚 CHAGE 門市的 Google 商家檔案點餐服務資訊，並發布成 GitHub Pages 靜態網站。

## 目前資料狀態

- 官方門市清單來自茶聚官網「門市據點」。
- GMB 欄位先建立 Google Maps 查詢連結與查核狀態。
- GMB 點餐外帶 / 外送供應商以 Chrome 自動化逐店開啟 Google 搜尋與 Google Maps 查核。
- 沒有看到「點餐外帶」或「點餐外送」按鈕的門市會記錄為 `false`，不列入供應商統計。

## 更新資料

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools\fetch_official_stores.py
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tools\check_gmb_orders.mjs
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools\normalize_results.py
```

產出：

- `data/stores.json`
- `data/stores.csv`

## GitHub Pages

本專案是純靜態網站，GitHub Pages 可直接使用 `main` branch root 目錄發布。
