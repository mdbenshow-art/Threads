import json
import openpyxl
import os
import sys
from datetime import datetime

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    current_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(current_dir, "Thunderbit_728985_20260716_060311.xlsx")
    json_output_path = os.path.join(current_dir, "水果市場評論貼文_匯入進度.json")
    html_output_path = os.path.join(current_dir, "水果市場評論貼文_瀏覽.html")
    index_output_path = os.path.join(current_dir, "index.html")
    
    if not os.path.exists(excel_path):
        print(f"錯誤：找不到 Excel 檔案 {excel_path}")
        return

    print("正在讀取 Excel 檔案...")
    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb.active
        
        posts = []
        # Columns: 貼文標題 (1), 貼文圖片 (2), 發布日期 (3), 貼文內容 (4), 作者名稱 (5), 作者頭像 (6)
        for row in range(2, sheet.max_row + 1):
            title = sheet.cell(row=row, column=1).value
            image = sheet.cell(row=row, column=2).value
            date_val = sheet.cell(row=row, column=3).value
            content = sheet.cell(row=row, column=4).value
            author = sheet.cell(row=row, column=5).value
            avatar = sheet.cell(row=row, column=6).value
            
            # Skip empty rows
            if not title and not content and not author:
                continue
                
            # Format date
            date_str = ""
            if date_val:
                if isinstance(date_val, datetime):
                    date_str = date_val.strftime('%Y-%m-%d')
                else:
                    date_str = str(date_val).split(' ')[0]
            
            posts.append({
                "貼文標題": str(title or "").strip(),
                "貼文圖片": str(image or "").strip(),
                "發布日期": date_str,
                "貼文內容": str(content or "").strip(),
                "作者名稱": str(author or "").strip(),
                "作者頭像": str(avatar or "").strip()
            })

        # Write to JSON file
        print(f"正在寫入 JSON 檔案：{json_output_path}...")
        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
            
        # Write to HTML file
        print(f"正在生成瀏覽網頁：{html_output_path}...")
        html_content = generate_html(posts)
        with open(html_output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        # Write to index.html for GitHub Pages hosting
        print(f"正在生成 GitHub Pages 首頁：{index_output_path}...")
        with open(index_output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        print("轉換成功！您現在可以直接雙擊開啟 '水果市場評論貼文_瀏覽.html' 進行閱讀。")
        
    except Exception as e:
        print(f"發生錯誤：{str(e)}")

def generate_html(posts_data):
    # JSON dump for embedding
    embedded_json = json.dumps(posts_data, ensure_ascii=False, indent=2)
    
    html_template = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>水果市場評論貼文 - JSON 條列數據瀏覽器</title>
    <style>
        :root {{
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --border-color: #e2e8f0;
            --accent: #4f46e5;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #64748b;
        }}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            padding: 40px 20px;
        }}
        
        .container {{
            max-width: 900px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }}
        
        header {{
            text-align: center;
            margin-bottom: 20px;
        }}
        
        h1 {{
            font-size: 1.8rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }}
        
        .subtitle {{
            color: var(--text-secondary);
            font-size: 0.95rem;
        }}
        
        .list-container {{
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        
        ul.json-list {{
            list-style-type: none;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }}
        
        li.json-item {{
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
        }}
        
        li.json-item:last-child {{
            border-bottom: none;
            padding-bottom: 0;
        }}
        
        .item-number {{
            font-weight: 600;
            font-size: 1rem;
            color: var(--accent);
            margin-bottom: 8px;
            display: block;
        }}
        
        pre {{
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
            font-size: 0.85rem;
            color: #0f172a;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>水果市場評論貼文 - JSON 條列數據瀏覽器</h1>
            <p class="subtitle">依據 Thunderbit_728985_20260716_060311.xlsx 欄位格式條列呈現</p>
        </header>
        
        <div class="list-container">
            <ul class="json-list" id="json-list"></ul>
        </div>
    </div>

    <script>
        const postsData = {embedded_json};
        const jsonList = document.getElementById('json-list');

        postsData.forEach((post, idx) => {{
            const li = document.createElement('li');
            li.className = 'json-item';
            
            const pre = document.createElement('pre');
            pre.innerText = JSON.stringify(post, null, 2);
            
            const span = document.createElement('span');
            span.className = 'item-number';
            span.innerText = `第 ${{idx + 1}} 筆數據：`;
            
            li.appendChild(span);
            li.appendChild(pre);
            jsonList.appendChild(li);
        }});
    </script>
</body>
</html>
"""
    return html_template

if __name__ == "__main__":
    main()
