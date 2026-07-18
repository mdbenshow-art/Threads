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
4. **霓虹暗色調（Dark Neon）Web 介面**：
   - 使用 Vanilla CSS 打造的精美玻璃擬物化（Glassmorphism）介面與骨架屏（Skeleton Screen）載入動畫。
   - 支援前端即時關鍵字過濾、按讚數/回覆數/時間排序，以及 CSV/JSON 快速匯出。

---

## 📂 專案結構

```bash
├── public/                 # 前端網頁目錄
│   ├── index.html          # Web 應用主頁面
│   ├── style.css           # 霓虹玻璃擬物化樣式表
│   └── app.js              # 前端控制邏輯與 API 互動
├── server.js               # 後端 Express 伺服器與 Playwright 爬蟲核心
├── package.json            # Node.js 依賴配置文件
├── excel_to_json_converter.py # 獨立的 Excel 轉 JSON & HTML 工具
├── 水果市場評論貼文_匯入進度.xlsx # 產出之分析 Excel 檔案
├── 水果市場評論貼文_匯入進度.json # 轉換出的實體 JSON 資料檔
├── 水果市場評論貼文_瀏覽.html     # 純離線、可雙擊打開的卡片式數據瀏覽網頁
└── README.md               # 本說明文件
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

安裝 Python 操作 Excel 的必要套件：
```bash
pip install openpyxl
```

### 2. 啟動伺服器

執行以下命令啟動本地後端伺服器（預設運行在 `http://localhost:3000`）：
```bash
npm start
```

打開瀏覽器訪問 `http://localhost:3000` 即可開始使用 Web 介面！

---

## 📝 使用說明

### A. 網頁爬取與即時分析
1. 在網頁上方的輸入框中，輸入 Threads 的**帳號名稱**（如：`abc89151207`）或**特定貼文網址**。
2. 點擊 **開始爬取**，系統將自動啟動 Playwright 執行背景爬取，並透過骨架屏展示載入狀態。
3. 爬取完成後，您可以透過介面上的搜尋框過濾關鍵字，或使用排序功能按讚數、回覆數篩選精華留言。

### B. 追加寫入 Excel 匯入進度
系統在執行爬取單篇討論串時，會產生最新的數據，並可呼叫後端 Python 腳本將新留言追加至 `水果市場評論貼文_匯入進度.xlsx` 中。
* **注意**：在執行寫入動作前，請確保您的 **Microsoft Excel 已關閉該檔案**，以免因系統檔案鎖定導致寫入權限出錯。

---

## 🔄 每日自動排程爬蟲 (Daily Scheduled Sync)

專案包含排程腳本 `daily_sync.js` 與 `run_daily.bat`，可透過 **Windows 工作排程器 (Task Scheduler)** 實現每日早上 6:00 自動執行爬蟲。

### 1. 工作原理
- **自動排程** 每日 6:00 AM 啟動。
- 透過 [daily_sync.js](file:///c:/Users/User/Desktop/Threads/daily_sync.js) 自動爬取帳號 `@abc89151207` 的最新 10 篇貼文。
- 呼叫 [update_excel.py](file:///c:/Users/User/Desktop/Threads/update_excel.py) 解析並自動追加新貼文到 [水果市場評論貼文_匯入進度.xlsx](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_匯入進度.xlsx)。
- 自動過濾重複的貼文，並將進度與錯誤記錄寫入 [sync_log.txt](file:///c:/Users/User/Desktop/Threads/sync_log.txt)。

### 2. 工作排程器設定指令
我們已成功在系統中註冊名稱為 `ThreadsDailySync` 的排程工作。以下為常用的管理指令（於 PowerShell 中執行）：

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

## 💾 3. Excel 轉 JSON 與靜態網頁瀏覽工具

如果您想將爬蟲同步進來的 Excel 檔案轉換為實體 JSON 數據並在離線網頁中瀏覽，專案提供了一個獨立的 Python 腳本 [excel_to_json_converter.py](file:///c:/Users/User/Desktop/Threads/excel_to_json_converter.py)。

### A. 使用方法
在專案根目錄下，開啟終端機/PowerShell 執行：
```powershell
python excel_to_json_converter.py
```

### B. 輸出產物
1. **[水果市場評論貼文_匯入進度.json](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_匯入進度.json)**：Excel 欄位轉換後的純 JSON 陣列檔案。
2. **[水果市場評論貼文_瀏覽.html](file:///c:/Users/User/Desktop/Threads/水果市場評論貼文_瀏覽.html)**：完全獨立的靜態網頁。您可以**直接雙擊開啟它**，不需運行後端伺服器，即可在瀏覽器中讀取該 JSON 數據，並進行即時關鍵字搜尋、日期排序與段落折疊展開。
