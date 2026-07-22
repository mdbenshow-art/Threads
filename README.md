# Threads 爬蟲與產銷數據分析系統 (Threads Scraper & Market Analyzer)

這是一個基於 **Node.js (Express + Playwright)** 與 **Python (openpyxl)** 開發的 Threads 數據爬蟲與分析平台。系統支持雙軌爬蟲架構，分別為**水果市場（農民日常）**與**蔬菜批發（蔬菜批發找莎拉）**進行精準的社群貼文監控與全文爬取。

---

## 🚀 功能特點

1. **雙軌平行爬蟲系統**：
   * **🍉 水果市場 (農民日常 - @abc89151207)**：
     - 自動爬取最新 10 篇串文與留言。
     - **寫入 Excel**：將排重後的資料寫入 `水果市場評論貼文_匯入進度.xlsx`。
     - **日期對齊與清洗**：對齊至當日零點，清洗標題中所有 Emoji。
     - **動態更新**：自動同步 JSON 與離線 HTML 網頁。
   * **🥬 蔬菜批發 (蔬菜批發找莎拉 - @water.mekelong)**：
     - 完全獨立運作，**不寫入 Excel**，直接儲存於您的**電腦桌面專用資料夾**。
     - **動態探索佇列**：在爬取過程中自動掃描 DOM 中的關聯貼文連結，主動發現原創母貼文並加入爬取隊伍，確保完整取得最原始的非截斷全文與所有分支留言。
     - **桌面輸出**：於桌面建立 `water.mekelong-水果生鮮資料夾`，並導出 `water.mekelong_posts.json` 與 `water.mekelong_瀏覽.html`。
2. **全文解鎖與防截斷技術**：
   * 透過比對多個 Relay 快取 script 標籤與動態母貼文加載，避開網頁端 CSS line-clamp `... 更多 / 閱讀全文` 限制，自動獲取 100% 完整的貼文正文。
3. **網頁端一鍵手動更新**：
   * 兩套爬蟲均支援手動一鍵更新！
   * 水果市場：直接雙擊執行 [手動一鍵更新.bat](file:///c:/Users/User/Desktop/Threads/手動一鍵更新.bat)。
   * 蔬菜批發：可啟動本地後端伺服器，至網頁觀測台 `http://localhost:3000/sarah.html` 點擊 **「一鍵更新資料」** 按鈕，下方終端控制台會實時顯示爬取進度日誌。
4. **離線與線上數據瀏覽器**：
   * 水果市場與蔬菜批發均備有玻璃擬物化（Glassmorphism）暗色調數據瀏覽網頁。
   * 支援直接雙擊離線開啟瀏覽，提供即時關鍵字搜尋、依日期/日期逆序/標題排序，以及展開與收折子貼文串留言。

---

## 📂 專案結構

```bash
├── public/                     # 線上 Web 觀測台前端
│   ├── index.html              # 水果市場 Web 控制台
│   ├── sarah.html              # 🥬 蔬菜批發觀測台 (翡翠綠極簡暗色調)
│   ├── sarah.js                # 蔬菜批發前端控制與 API 連接
│   ├── style.css               # 控制台全域 UI 樣式表
│   └── app.js                  # 水果市場前端控制與 API 連接
├── .venv/                      # Python 虛擬環境 (包含 openpyxl 等套件)
├── server.js                   # 後端 Express 伺服器與 Playwright 爬蟲核心 API
├── daily_sync.js               # 水果市場爬蟲核心同步腳本 (自動同步最新 10 篇貼文與子串文)
├── daily_sync_sarah.js         # 🥬 蔬菜批發爬蟲核心同步腳本 (動態佇列 + 全文爬取)
├── update_excel.py             # Python 腳本：將水果爬取資料寫入 Excel 並過濾重複
├── excel_to_json_converter.py  # Python 腳本：將水果 Excel 轉為 JSON 與 HTML 網頁
├── 手動一鍵更新.bat             # ⚡ 水果市場：手動雙擊一鍵完成爬蟲與網頁更新
├── run_daily.bat               # 水果市場排程專用：每日早上 6:00 背景自動執行
├── run_daily_sarah.bat         # 🥬 蔬菜批發排程專用：每日早上 6:00 背景自動執行
├── 水果市場評論貼文_匯入進度.xlsx # 水果市場核心數據 Excel 檔案
├── 水果市場評論貼文_匯入進度.json # 水果市場 JSON 數據
├── 水果市場評論貼文_瀏覽.html     # 水果市場本地離線、可雙擊開啟的瀏覽網頁
├── index.html                  # 水果市場專案首頁 (與 水果市場評論貼文_瀏覽.html 同步，供 GitHub Pages 使用)
├── sync_log.txt                # 水果市場更新執行日誌檔
├── package.json                # Node.js 專案配置文件
└── README.md                   # 本說明文件
```

---

## 💻 本地安裝與運行指南

### 1. 安裝環境依賴

請確保您的電腦已安裝 **Node.js (v18+)** 與 **Python (v3.10+)**。

在專案根目錄下開啟終端機，執行以下命令安裝 Node.js 依賴套件（包含 Playwright 爬蟲引擎）：
```bash
npm install
```

如果未安裝 Python 虛擬環境或 openpyxl，可使用本機虛擬環境安裝必要套件：
```bash
.venv\Scripts\pip install -r requirements.txt
```
*(或直接在命令提示字元中執行 `pip install openpyxl`)*

### 2. 啟動 Web 觀測台後端

如果您需要使用網頁端的「一鍵更新」按鈕與動態網頁介面，請開啟本地伺服器：
```bash
npm start
```
啟動後訪問以下網址：
* **水果市場控制台**：`http://localhost:3000`
* **蔬菜批發控制台**：`http://localhost:3000/sarah.html`

---

## 📅 每日早上 6 點自動更新（Windows 工作排程器）

我們已在 Windows 系統內註冊了兩項獨立的每日排程任務，在**每日早上 06:00** 自動於背景靜默運行爬蟲，不打擾您的日常使用。

### 1. 水果市場排程：`ThreadsDailySync`
* **工作內容**：執行 `run_daily.bat`，更新 Excel、JSON 與離線網頁。
* **日誌路徑**：`c:\Users\User\Desktop\Threads\sync_log.txt`

### 2. 蔬菜批發排程：`ThreadsSarahDailySync`
* **工作內容**：執行 `run_daily_sarah.bat`，自動輸出最新的全文 JSON 與離線網頁至您電腦桌面。
* **桌面路徑**：`C:\Users\User\Desktop\water.mekelong-水果生鮮資料夾\`
* **日誌路徑**：`C:\Users\User\Desktop\water.mekelong-水果生鮮資料夾\sarah_sync_log.txt`

### 🛠️ 排程常用維護指令（PowerShell 管理員模式）

* **立即手動測試執行某項排程**：
  ```powershell
  # 測試水果市場
  Start-ScheduledTask -TaskName "ThreadsDailySync"
  # 測試蔬菜批發
  Start-ScheduledTask -TaskName "ThreadsSarahDailySync"
  ```
* **查詢排程狀態與下次執行時間**：
  ```powershell
  Get-ScheduledTaskInfo -TaskName "ThreadsDailySync"
  Get-ScheduledTaskInfo -TaskName "ThreadsSarahDailySync"
  ```
* **刪除/解除註冊排程工作**：
  ```powershell
  Unregister-ScheduledTask -TaskName "ThreadsDailySync" -Confirm:$false
  Unregister-ScheduledTask -TaskName "ThreadsSarahDailySync" -Confirm:$false
  ```

---

## 💾 離線靜態瀏覽工具

如果您不需要進行更新，只是想查閱已有的歷史數據，您不需要啟動任何後端，直接於本地雙擊開啟以下檔案即可：
* **水果市場歷史**：[水果市場評論貼文_瀏覽.html](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_瀏覽.html)
* **蔬菜批發歷史**：`C:\Users\User\Desktop\water.mekelong-水果生鮮資料夾\water.mekelong_瀏覽.html`
