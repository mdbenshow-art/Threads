# Threads 爬蟲與產銷數據分析系統 (Threads Scraper & Market Analyzer)

這是一個基於 **Node.js (Express + Playwright)** 與 **Python (openpyxl)** 開發的 Threads 數據爬蟲與分析平台。專門用於爬取 Threads 上的貼文、子串文、其他使用者的留言與回覆，並支援將資料以符合特定格式的 Excel 檔案匯出，非常適合產銷行情分析與社群討論監測。

DIMO: https://mdbenshow-art.github.io/Threads/
---

## 🚀 功能特點

1. **多維度爬取**：
   - **個人專頁爬取**：輸入 Threads 帳號（如 `@abc89151207`）即可快速獲取其歷史串文、按讚數、回覆數與發布日期。
   - **討論串完整爬取**：輸入單篇貼文網址（如 `/post/Da0UctUj5F3`）即可完整擷取該貼文串，包含原作者的連續子貼文與所有其他使用者的留言。
2. **全文展開技術**：
   - 自動解析 Threads 的伺服器端渲染（SSR）資料與長篇文字附件，避開網頁端的 `... 更多 / 閱讀全文` 截斷限制，獲取 100% 完整的文章內容。
3. **Excel 進度自動匯入與格式對齊**：
   - 自動將資料寫入指定格式的 Excel 檔案（`水果市場評論貼文_匯入進度.xlsx`）。
   - **標題 Emoji 清洗**：自動移除標題欄位中的表情符號以維持版面整潔。
   - **時間歸零**：將發布日期對齊至當天零點（00:00:00），以符合分析範本的標準。
   - **防重複機制**：自動比對已存在之全文，避免多次爬取時寫入重複行。
4. **手動一鍵更新流程**：
   - 提供快捷批次檔，輕按兩下即可自動執行「爬蟲同步 ➡️ 匯入 Excel ➡️ 轉出 JSON 與離線 HTML」，實現真正的零設定一鍵更新。
5. **離線與線上數據瀏覽器**：
   - 提供霓虹暗色調（Dark Neon）的精美玻璃擬物化（Glassmorphism）網頁。
   - 支援離線直接開啟瀏覽（`水果市場評論貼文_瀏覽.html`），也支援發佈至 GitHub Pages 供線上多人瀏覽。
   - 擁有即時關鍵字篩選、依日期/按讚/回覆排序，以及展開/收折子貼文功能。

---

## 📂 專案結構

```bash
├── public/                     # 網頁應用程序前端目錄 (用於本地後端伺服器)
│   ├── index.html              # 本地 Web 應用主頁面 (動態爬取介面)
│   ├── style.css               # 霓虹玻璃擬物化樣式表
│   └── app.js                  # 前端控制邏輯與 API 互動
├── .venv/                      # Python 虛擬環境 (包含 openpyxl 等套件)
├── server.js                   # 後端 Express 伺服器與 Playwright 爬蟲核心 API
├── daily_sync.js               # 爬蟲核心同步腳本 (自動同步最新 10 篇貼文與子串文)
├── update_excel.py             # Python 腳本：將爬取資料寫入 Excel 並過濾重複
├── excel_to_json_converter.py  # Python 腳本：讀取 Excel 轉為 JSON 與 HTML 網頁
├── 手動一鍵更新.bat             # ⚡ Windows 專用：手動雙擊一鍵完成爬蟲與網頁更新
├── run_daily.bat               # 排程專用：配合 Windows 工作排程器每日自動執行
├── 水果市場評論貼文_匯入進度.xlsx # 核心數據 Excel 檔案
├── 水果市場評論貼文_匯入進度.json # 轉換出的結構化 JSON 數據
├── 水果市場評論貼文_瀏覽.html     # 純離線、可雙擊開啟的卡片式數據瀏覽網頁
├── index.html                  # 專案首頁 (與 水果市場評論貼文_瀏覽.html 同步，供 GitHub Pages 使用)
├── sync_log.txt                # 爬蟲與更新的執行日誌檔
├── package.json                # Node.js 專案配置文件
└── README.md                   # 本說明文件
```

---

## 🛠️ 開發技術棧

* **後端核心**：Node.js v24+, Express
* **網頁自動化與爬蟲**：Playwright Core (調用內建 Edge/Chrome 瀏覽器，免登入爬取)
* **資料庫/檔案處理**：Python v3.10+, openpyxl (讀寫 Excel 檔案)
* **前端介面**：Vanilla HTML5 / CSS3 / JavaScript (ES6)

---

## 💻 安裝與運行指南

### 1. 安裝環境依賴

請確保您的電腦已安裝 **Node.js** 與 **Python**。

在專案目錄下執行以下命令安裝 Node.js 依賴套件：
```bash
npm install
```

如果未安裝 Python 虛擬環境或 openpyxl，可使用本機虛擬環境安裝必要套件：
```bash
.venv\Scripts\pip install -r requirements.txt
```
*(或直接 `pip install openpyxl`)*

### 2. 本地開發伺服器（非必要）

如果您想要使用動態的 Web 互動爬取介面，可以啟動後端 Express 伺服器：
```bash
npm start
```
打開瀏覽器訪問 `http://localhost:3000` 即可使用動態爬取介面。

---

## 🔄 數據更新說明

我們提供了兩種方式來保持您的數據為最新狀態：

### A. 手動一鍵更新（最推薦 🚀）
為了省去繁瑣的指令輸入，我們設計了 **`手動一鍵更新.bat`**：
1. **重要**：在更新前，請先確保已**關閉**您電腦上的 `水果市場評論貼文_匯入進度.xlsx` 檔案，避免 Excel 鎖定檔案導致無法寫入。
2. 雙擊執行 [手動一鍵更新.bat](file:///c:/Users/User/Desktop/Threads/手動一鍵更新.bat)。
3. 程式會自動啟動並依序執行：
   * 爬取最新 10 篇貼文與所有留言。
   * 將新貼文排重後追加寫入 Excel。
   * 自動轉換 Excel 為最新的 JSON 與 HTML 網頁。
4. 跑完後，直接雙擊打開 [水果市場評論貼文_瀏覽.html](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_瀏覽.html) 即可查閱最新資料！

### B. 每日自動排程 (Daily Scheduled Sync)
若您的電腦在每日早上 6:00 處於開機且未休眠狀態，可透過 **Windows 工作排程器 (Task Scheduler)** 實現自動更新：

- **自動排程工作原理**：
  - 透過 `run_daily.bat` 每日早上 6:00 啟動，自動爬取帳號 `@abc89151207` 的最新貼文。
  - 自動寫入 Excel、更新網頁與 JSON 檔案，日誌將輸出至 `sync_log.txt`。

- **工作排程器設定指令（於 PowerShell 中執行）**：
  - **手動啟動排程測試**：
    ```powershell
    Start-ScheduledTask -TaskName "ThreadsDailySync"
    ```
  - **查詢排程狀態與下次執行時間**：
    ```powershell
    Get-ScheduledTaskInfo -TaskName "ThreadsDailySync"
    ```
  - **刪除排程工作**：
    ```powershell
    Unregister-ScheduledTask -TaskName "ThreadsDailySync" -Confirm:$false
    ```

---

## 💾 靜態網頁瀏覽工具

專案內含完全獨立的離線網頁，不需運行後端伺服器即可直接開啟：

1. **[水果市場評論貼文_瀏覽.html](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_瀏覽.html)**：本地的卡片式數據瀏覽網頁。您可**直接雙擊開啟它**，進行即時搜尋、篩選與段落折疊。
2. **[index.html](file:///c:/Users/User/Desktop/Threads/index.html)**：與上述網頁完全同步，可直接推送至 GitHub 開啟 **GitHub Pages** 服務，將其發佈為線上公開網頁。
