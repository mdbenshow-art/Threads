const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// Log message to file and console
function logMessage(message, isError = false) {
  const timestamp = new Date().toLocaleString('zh-TW');
  const formattedLog = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}\n`;
  console.log(message);
  
  const logFilePath = path.join(__dirname, 'sync_log.txt');
  fs.appendFileSync(logFilePath, formattedLog, 'utf8');
}

(async () => {
  const username = 'abc89151207';
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

  // Launch Browser (MS Edge or Google Chrome)
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
  } catch (err) {
    logMessage(`Error navigating to profile page: ${err.message}`, true);
    await browser.close();
    process.exit(1);
  }

  const currentUrl = page.url();
  const pageTitle = await page.title();
  logMessage(`Current page URL: ${currentUrl}`);
  logMessage(`Page Title: ${pageTitle}`);

  // Extract edges from embedded JSON
  logMessage('Extracting profile HTML and searching for embedded JSON...');
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
    logMessage('Failed to find profile posts in embedded JSON. The profile might be private or blocked.', true);
    try {
      await page.screenshot({ path: path.join(__dirname, 'debug_profile_error.png') });
      logMessage(`Saved debug screenshot to debug_profile_error.png`);
      fs.writeFileSync(path.join(__dirname, 'debug_profile.html'), html, 'utf8');
      logMessage(`Saved debug HTML to debug_profile.html`);
    } catch (ssErr) {
      logMessage(`Failed to save debug files: ${ssErr.message}`, true);
    }
    await browser.close();
    process.exit(1);
  }

  // Extract recent thread codes
  const threadCodes = [];
  
  for (const edge of targetEdges) {
    const node = edge.node;
    if (!node || !node.thread_items) continue;
    
    // The first item is usually the main post
    const post = node.thread_items[0]?.post;
    if (post && post.code) {
      threadCodes.push(post.code);
    }
  }

  logMessage(`Found ${threadCodes.length} recent thread codes: ${threadCodes.join(', ')}`);
  
  // We will process the latest 10 threads for sync
  const targetCodes = threadCodes.slice(0, 10);
  logMessage(`Processing latest ${targetCodes.length} threads for detailed crawl: ${targetCodes.join(', ')}`);

  const crawledPosts = [];

  // 2. Fetch details for each thread code
  for (const code of targetCodes) {
    logMessage(`----------------------------------------`);
    const postUrl = `https://www.threads.net/t/${code}?hl=zh-tw`;
    logMessage(`Loading thread details: ${postUrl}`);
    
    try {
      await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 40000 });
      await page.waitForTimeout(3000);
      
      const html = await page.content();
      const regex = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      let targetObj = null;
      
      while ((match = regex.exec(html)) !== null) {
        const content = match[1];
        if (content.includes(code) && content.includes('thread_items')) {
          try {
            const parsed = JSON.parse(content);
            const edges = findEdges(parsed);
            if (edges) {
              targetObj = edges;
              break;
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
          // Filter to only include posts/replies written by the main author
          if (post && post.user?.username === username) {
            rawPosts.push(post);
          }
        });
      });
      
      if (rawPosts.length === 0) {
        logMessage(`No posts found by @${username} in thread ${code}.`);
        continue;
      }
      
      // Sort posts chronologically to combine
      rawPosts.sort((a, b) => a.taken_at - b.taken_at);
      logMessage(`Found ${rawPosts.length} posts by @${username} in thread ${code}.`);
      
      // Extract contents
      const contents = rawPosts.map((post, idx) => {
        let text = post.caption?.text || '';
        const snippetText = post.text_post_app_info?.snippet_attachment_info?.text_fragments?.fragments?.[0]?.plaintext;
        if (snippetText && snippetText.length > text.length) {
          text = snippetText;
        }
        
        // Small title is the first line of each segment (for the first post, it is the big title)
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
      const mainTitle = originalPost.title; // 🔊每週評水果市場 7/16-7/19
      const originalContent = originalPost.text; // Main post content
      const fullContent = contents.map(c => c.text).join('\n\n'); // Combined content
      
      crawledPosts.push({
        username: username,
        authorName: '農民日常',
        smallTitle: mainTitle,
        dateTimestamp: originalPost.dateTimestamp,
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

  // 3. Write crawled posts to temp JSON
  const tempJsonPath = path.join(__dirname, 'temp_sync_posts.json');
  fs.writeFileSync(tempJsonPath, JSON.stringify(crawledPosts, null, 2), 'utf8');
  logMessage(`Saved temp JSON data to ${tempJsonPath}`);

  // 4. Invoke Python script to update Excel
  const pythonCmd = `"${path.join(__dirname, '.venv', 'Scripts', 'python')}" "${path.join(__dirname, 'update_excel.py')}"`;
  logMessage(`Invoking Python Excel update script...`);
  
  exec(pythonCmd, (error, stdout, stderr) => {
    // Clean up temp JSON
    if (fs.existsSync(tempJsonPath)) {
      try {
        fs.unlinkSync(tempJsonPath);
      } catch (err) {
        logMessage(`Failed to delete temp JSON: ${err.message}`, true);
      }
    }
    
    if (error) {
      logMessage(`Python script execution error (Code: ${error.code}):\n${stderr || error.message}`, true);
      logMessage(`=== SYNC FAILED ===\n`);
      process.exit(1);
    }
    
    logMessage(`Python stdout:\n${stdout}`);
    logMessage(`=== SYNC COMPLETED SUCCESSFULLY ===\n`);
    process.exit(0);
  });
})();
