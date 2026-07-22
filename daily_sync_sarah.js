const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// Helper to recursively find the 'edges' array that contains thread items
function findEdges(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj.edges && Array.isArray(obj.edges)) {
    if (obj.edges.length > 0 && obj.edges[0]?.node?.thread_items) {
      return obj.edges;
    }
  }
  
  for (const val of Object.values(obj)) {
    const found = findEdges(val);
    if (found) return found;
  }
  
  return null;
}

const destDir = path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Desktop', 'water.mekelong-水果生鮮資料夾');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Log message to file and console
function logMessage(message, isError = false) {
  const timestamp = new Date().toLocaleString('zh-TW');
  const formattedLog = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}\n`;
  console.log(message);
  
  const logFilePath = path.join(destDir, 'sarah_sync_log.txt');
  fs.appendFileSync(logFilePath, formattedLog, 'utf8');
}

function stripEmojis(text) {
  if (!text) return "";
  // Regex to match emojis, dingbats, and other supplemental symbols
  const emojiPattern = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\u2600-\u27BF|\u2300-\u23FF|\u2B50|\u2B06|\u2192|\u26A0|\u26A1/g;
  return text.replace(emojiPattern, '').trim();
}

function generateHtml(postsData) {
  const embeddedJson = JSON.stringify(postsData, null, 2);
  
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>蔬菜批發找莎拉 - 數據瀏覽器</title>
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0d0f12;
            --card-bg: rgba(22, 28, 36, 0.7);
            --card-border: rgba(255, 255, 255, 0.08);
            --accent: #10b981;
            --accent-glow: rgba(16, 185, 129, 0.3);
            --success: #10b981;
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --text-muted: #6b7280;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Inter', -apple-system, sans-serif;
            line-height: 1.6;
            padding: 40px 20px;
            background-image: 
                radial-gradient(at 10% 20%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
                radial-gradient(at 90% 80%, rgba(139, 92, 246, 0.05) 0px, transparent 50%);
            background-attachment: fixed;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        header {
            text-align: center;
            margin-bottom: 10px;
        }
        
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.2rem;
            font-weight: 700;
            background: linear-gradient(to right, #fff, #a7f3d0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }
        
        /* Controls */
        .controls-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .search-group {
            flex: 1;
            min-width: 250px;
            position: relative;
        }
        
        .search-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 10px 16px;
            color: var(--text-primary);
            font-size: 0.9rem;
            outline: none;
            transition: all 0.3s ease;
        }
        
        .search-input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 10px var(--accent-glow);
        }
        
        .sort-group select {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 10px 16px;
            color: var(--text-primary);
            font-size: 0.9rem;
            outline: none;
            cursor: pointer;
        }
        
        .stats-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #34d399;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        /* Feed */
        .feed {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .post-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .post-card:hover {
            border-color: rgba(16, 185, 129, 0.3);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .author-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .author-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--success);
            font-size: 0.8rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 6px;
            width: fit-content;
        }
        
        .date-label {
            font-size: 0.85rem;
            color: var(--text-muted);
        }
        
        .main-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.1rem;
            font-weight: 600;
            color: #fff;
        }
        
        .post-content {
            font-size: 0.95rem;
            color: var(--text-primary);
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .expand-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: var(--text-secondary);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.85rem;
            cursor: pointer;
            width: fit-content;
            margin-top: 4px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .expand-btn:hover {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--accent);
            color: #fff;
        }
        
        .full-content-box {
            margin-top: 10px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px dashed rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 16px;
            font-size: 0.9rem;
            color: var(--text-primary);
            white-space: pre-wrap;
        }
        
        .hidden {
            display: none !important;
        }
        
        .empty-feed {
            text-align: center;
            padding: 40px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>蔬菜批發找莎拉 - 數據瀏覽器</h1>
            <p class="subtitle">Threads 貼文與回覆內容離線檢視</p>
        </header>
        
        <div class="controls-card">
            <div class="search-group">
                <input type="text" id="search-input" class="search-input" placeholder="搜尋標題、內容或作者...">
            </div>
            
            <div class="sort-group">
                <select id="sort-select">
                    <option value="newest">發布日期: 由新到舊</option>
                    <option value="oldest">發布日期: 由舊到新</option>
                    <option value="title">標題排序</option>
                </select>
            </div>
            
            <div class="stats-badge">
                共有 <span id="posts-count">0</span> 筆紀錄
            </div>
        </div>
        
        <div id="feed" class="feed"></div>
    </div>

    <script>
        const postsData = ${embeddedJson};

        const searchInput = document.getElementById('search-input');
        const sortSelect = document.getElementById('sort-select');
        const postsCount = document.getElementById('posts-count');
        const feed = document.getElementById('feed');

        // Initial load
        applyFiltersAndSort();

        // Listeners
        searchInput.addEventListener('input', applyFiltersAndSort);
        sortSelect.addEventListener('change', applyFiltersAndSort);

        function applyFiltersAndSort() {
            const searchText = searchInput.value.toLowerCase().trim();
            const sortBy = sortSelect.value;
            
            // 1. Filter
            let filtered = postsData.filter(post => {
                return (
                    post.smallTitle.toLowerCase().includes(searchText) ||
                    post.originalContent.toLowerCase().includes(searchText) ||
                    post.fullContent.toLowerCase().includes(searchText) ||
                    post.authorName.toLowerCase().includes(searchText) ||
                    post.username.toLowerCase().includes(searchText) ||
                    post.date.includes(searchText)
                );
            });
            
            // 2. Sort
            filtered.sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.date) - new Date(a.date);
                } else if (sortBy === 'oldest') {
                    return new Date(a.date) - new Date(b.date);
                } else if (sortBy === 'title') {
                    return a.smallTitle.localeCompare(b.smallTitle, 'zh-TW');
                }
                return 0;
            });
            
            postsCount.innerText = filtered.length;
            renderFeed(filtered);
        }

        function renderFeed(posts) {
            feed.innerHTML = '';
            
            if (posts.length === 0) {
                feed.innerHTML = \`
                    <div class="empty-feed">
                        <p>沒有找到符合條件的貼文紀錄。</p>
                    </div>
                \`;
                return;
            }
            
            posts.forEach((post, idx) => {
                const card = document.createElement('div');
                card.className = 'post-card';
                
                const hasFullContent = post.fullContent && post.fullContent.trim() !== post.originalContent.trim();
                
                card.innerHTML = \`
                    <div class="card-header">
                        <div class="author-info">
                            <span class="author-badge">@\${escapeHtml(post.username)} (\${escapeHtml(post.authorName)})</span>
                            <h4 class="main-title" style="margin-top: 6px;">\${escapeHtml(post.smallTitle)}</h4>
                        </div>
                        <span class="date-label">\${escapeHtml(post.date)}</span>
                    </div>
                    <div class="post-content">\${formatText(post.originalContent)}</div>
                    
                    \${hasFullContent ? \`
                        <button class="expand-btn" onclick="toggleFullContent(this, \${idx})">
                            <span>展開完整子貼文串 ▼</span>
                        </button>
                        <div id="full-box-\${idx}" class="full-content-box hidden">\${formatText(post.fullContent)}</div>
                    \` : ''}
                \`;
                feed.appendChild(card);
            });
        }

        function toggleFullContent(btn, idx) {
            const box = document.getElementById(\`full-box-\${idx}\`);
            if (box.classList.contains('hidden')) {
                box.classList.remove('hidden');
                btn.querySelector('span').innerText = '收起完整子貼文串 ▲';
            } else {
                box.classList.add('hidden');
                btn.querySelector('span').innerText = '展開完整子貼文串 ▼';
            }
        }

        function formatText(text) {
            return escapeHtml(text).replace(/\\n/g, '<br>');
        }

        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>`;
}

(async () => {
  const username = 'water.mekelong';
  logMessage(`=== START DAILY SYNC FOR @${username} ===`);
  
  let browser = null;
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  };

  // Launch Browser
  try {
    browser = await chromium.launch({ ...launchOptions, channel: 'msedge' });
    logMessage('Launched Microsoft Edge');
  } catch (e1) {
    logMessage('Microsoft Edge not available, trying Google Chrome...', true);
    try {
      browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
      logMessage('Launched Google Chrome');
    } catch (e2) {
      logMessage(`Failed to launch Chrome or Edge: ${e2.message}`, true);
      process.exit(1);
    }
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // 1. Crawl profile page
  const profileUrl = `https://www.threads.net/@${username}?hl=zh-tw`;
  logMessage(`Navigating to profile: ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(4000);
    
    // Scroll down 3 times to load more historical posts
    logMessage('Scrolling profile page to load more threads...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1500);
    }
  } catch (err) {
    logMessage(`Error navigating to profile page: ${err.message}`, true);
    await browser.close();
    process.exit(1);
  }

  const html = await page.content();
  const regex = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let targetEdges = null;

  while ((match = regex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes(username) && content.includes('thread_items')) {
      try {
        const parsed = JSON.parse(content);
        const edges = findEdges(parsed);
        if (edges) {
          targetEdges = edges;
          logMessage(`Found profile posts JSON with ${edges.length} thread(s).`);
          break;
        }
      } catch (e) {}
    }
  }

  if (!targetEdges) {
    logMessage('Failed to find profile posts in embedded JSON.', true);
    await browser.close();
    process.exit(1);
  }

  // Extract recent thread codes from embedded JSON
  const threadCodes = [];
  for (const edge of targetEdges) {
    const node = edge.node;
    if (!node || !node.thread_items) continue;
    
    const post = node.thread_items[0]?.post;
    if (post && post.code) {
      threadCodes.push(post.code);
    }
  }

  // Also extract thread codes from rendered DOM links (including those loaded via scrolling)
  const domCodes = await page.evaluate((uname) => {
    const results = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        const postPattern = new RegExp(`/[@]?${uname}/post/([^/?#]+)`, 'i');
        const tPattern = /\/t\/([^/?#]+)/i;
        const match = href.match(postPattern) || href.match(tPattern);
        if (match && match[1]) {
          results.push(match[1]);
        }
      }
    });
    return results;
  }, username);

  // Combine and deduplicate codes
  domCodes.forEach(code => {
    if (!threadCodes.includes(code)) {
      threadCodes.push(code);
    }
  });

  logMessage(`Found ${threadCodes.length} recent thread codes: ${threadCodes.join(', ')}`);
  
  // Process threads via dynamic queue to discover original posts
  const targetCodes = threadCodes.slice(0, 10);
  const crawledCodes = new Set();
  const crawledPosts = [];
  const maxThreadsToCrawl = 15;
  let crawlCount = 0;
  
  logMessage(`Processing threads for detailed crawl: ${targetCodes.join(', ')}`);

  while (targetCodes.length > 0 && crawlCount < maxThreadsToCrawl) {
    const code = targetCodes.shift();
    if (crawledCodes.has(code)) continue;
    crawledCodes.add(code);
    crawlCount++;
    
    logMessage(`----------------------------------------`);
    const postUrl = `https://www.threads.net/t/${code}?hl=zh-tw`;
    logMessage(`Loading thread details (${crawlCount}/${maxThreadsToCrawl}): ${postUrl}`);
    
    try {
      await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 40000 });
      await page.waitForTimeout(3000);
      
      // Extract newly found post codes from links on this page (helps find original root posts)
      const pageLinks = await page.evaluate((uname) => {
        const results = [];
        document.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href) {
            const postPattern = new RegExp(`/[@]?${uname}/post/([^/?#]+)`, 'i');
            const tPattern = /\/t\/([^/?#]+)/i;
            const match = href.match(postPattern) || href.match(tPattern);
            if (match && match[1]) {
              results.push(match[1]);
            }
          }
        });
        return results;
      }, username);
      
      // Queue newly found codes
      pageLinks.forEach(newCode => {
        if (!crawledCodes.has(newCode) && !targetCodes.includes(newCode)) {
          targetCodes.push(newCode);
          logMessage(`  -> Discovered referenced thread code in DOM: ${newCode}`);
        }
      });
      
      const html = await page.content();
      const regex = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      let targetObj = null;
      let maxTextLength = -1;
      
      while ((match = regex.exec(html)) !== null) {
        const content = match[1];
        if (content.includes('thread_items')) {
          try {
            const parsed = JSON.parse(content);
            const edges = findEdges(parsed);
            if (edges) {
              // Calculate combined text length to select the full text cache over truncated preview
              let combinedLength = 0;
              edges.forEach((edge) => {
                const threadItems = edge.node?.thread_items || [];
                threadItems.forEach((item) => {
                  const post = item.post;
                  if (post && post.user?.username === username) {
                    const text = post.caption?.text || '';
                    const snippetText = post.text_post_app_info?.snippet_attachment_info?.text_fragments?.fragments?.[0]?.plaintext;
                    const finalPostText = (snippetText && snippetText.length > text.length) ? snippetText : text;
                    combinedLength += finalPostText.length;
                  }
                });
              });
              
              if (combinedLength > maxTextLength) {
                maxTextLength = combinedLength;
                targetObj = edges;
              }
            }
          } catch (e) {}
        }
      }
      
      if (!targetObj) {
        logMessage(`Could not extract thread JSON for code: ${code}`, true);
        continue;
      }
      
      const rawPosts = [];
      targetObj.forEach((edge) => {
        const threadItems = edge.node?.thread_items || [];
        threadItems.forEach((item) => {
          const post = item.post;
          if (post && post.user?.username === username) {
            rawPosts.push(post);
          }
        });
      });
      
      if (rawPosts.length === 0) {
        logMessage(`No posts found by @${username} in thread ${code}.`);
        continue;
      }
      
      rawPosts.sort((a, b) => a.taken_at - b.taken_at);
      logMessage(`Found ${rawPosts.length} posts by @${username} in thread ${code}.`);
      
      const contents = rawPosts.map((post, idx) => {
        let text = post.caption?.text || '';
        const snippetText = post.text_post_app_info?.snippet_attachment_info?.text_fragments?.fragments?.[0]?.plaintext;
        if (snippetText && snippetText.length > text.length) {
          text = snippetText;
        }
        
        const title = text.split('\n')[0].trim().slice(0, 50);
        
        return {
          postNumber: idx + 1,
          code: post.code,
          title,
          text,
          dateTimestamp: post.taken_at
        };
      });
      
      const originalPost = contents[0];
      const mainTitle = originalPost.title;
      const originalContent = originalPost.text;
      const fullContent = contents.map(c => c.text).join('\n\n');
      
      let dateStr = "";
      const dtVal = new Date(originalPost.dateTimestamp * 1000);
      try {
        dateStr = dtVal.toISOString().split('T')[0];
      } catch (err) {
        dateStr = new Date().toISOString().split('T')[0];
      }
      
      crawledPosts.push({
        code: code,
        username: username,
        authorName: '蔬菜批發找莎拉',
        smallTitle: mainTitle,
        date: dateStr,
        originalContent: originalContent,
        fullContent: fullContent
      });
      
      logMessage(`Successfully processed thread ${code}. Title: "${mainTitle}"`);
      
    } catch (e) {
      logMessage(`Error crawling thread ${code}: ${e.message}`, true);
    }
  }

  await browser.close();
  logMessage(`----------------------------------------`);
  logMessage(`Scraping complete. Total valid posts retrieved: ${crawledPosts.length}`);

  if (crawledPosts.length === 0) {
    logMessage('No posts crawled. Sync aborted.');
    process.exit(0);
  }

  // 3. Load existing posts from desktop JSON
  const postsJsonPath = path.join(destDir, 'water.mekelong_posts.json');
  let existingPosts = [];
  if (fs.existsSync(postsJsonPath)) {
    try {
      const fileData = fs.readFileSync(postsJsonPath, 'utf8');
      existingPosts = JSON.parse(fileData);
      logMessage(`Loaded ${existingPosts.length} existing posts from desktop JSON.`);
    } catch (err) {
      logMessage(`Failed to read existing JSON: ${err.message}. Starting fresh.`, true);
    }
  }

  let newAppended = 0;
  crawledPosts.forEach((post) => {
    let duplicateIndex = -1;
    const isDuplicate = existingPosts.some((existing, idx) => {
      if (existing.code === post.code) {
        duplicateIndex = idx;
        return true;
      }
      const sliceLength = Math.min(100, post.fullContent.length, existing.fullContent.length);
      if (sliceLength > 0 && post.fullContent.slice(0, sliceLength) === existing.fullContent.slice(0, sliceLength)) {
        duplicateIndex = idx;
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      post.smallTitle = stripEmojis(post.smallTitle);
      existingPosts.push(post);
      newAppended++;
      logMessage(`  -> Added new post: ${post.smallTitle.slice(0, 30)}...`);
    } else {
      const existing = existingPosts[duplicateIndex];
      const existingHasMore = existing.fullContent.includes('更多') || existing.fullContent.includes('more') || existing.fullContent.includes('…');
      const newHasNoMore = !post.fullContent.includes('更多') && !post.fullContent.includes('more') && !post.fullContent.includes('…');
      
      // If the duplicate has longer content and the existing one was truncated (or new has no truncation markers)
      if (post.fullContent.length > existing.fullContent.length && (existingHasMore || newHasNoMore)) {
        logMessage(`  -> Updating duplicate post with longer full text: ${post.smallTitle.slice(0, 30)}...`);
        post.smallTitle = stripEmojis(post.smallTitle);
        existingPosts[duplicateIndex] = post;
        newAppended++;
      } else {
        logMessage(`  -> Skipping duplicate post: ${post.smallTitle.slice(0, 30)}...`);
      }
    }
  });

  if (newAppended > 0) {
    // Sort by date desc
    existingPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save updated JSON
    fs.writeFileSync(postsJsonPath, JSON.stringify(existingPosts, null, 2), 'utf8');
    logMessage(`Saved updated JSON database to: ${postsJsonPath}`);
    
    // Generate new HTML
    const htmlContent = generateHtml(existingPosts);
    const htmlPath = path.join(destDir, 'water.mekelong_瀏覽.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    logMessage(`Generated HTML browser page at: ${htmlPath}`);
    
    logMessage(`=== SYNC COMPLETED SUCCESSFULLY (Added ${newAppended} new posts) ===\n`);
  } else {
    logMessage('=== SYNC COMPLETED: No new posts were found ===\n');
  }
  process.exit(0);
})();
