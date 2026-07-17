const express = require('express');
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Helper to recursively find the 'edges' array that contains thread items
 */
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

/**
 * Helper to parse the dynamic OG Description for user details
 */
function parseOgDescription(desc, username) {
  if (!desc) return { followersText: '', threadsCountText: '', bio: '' };
  
  const parts = desc.split(' • ');
  let followersText = '';
  let threadsCountText = '';
  let bio = '';
  
  if (parts.length >= 1) {
    followersText = parts[0].trim();
  }
  if (parts.length >= 2) {
    threadsCountText = parts[1].trim();
  }
  if (parts.length >= 3) {
    let bioPart = parts.slice(2).join(' • ');
    // Remove localized trailing sentences
    const lookPattern = new RegExp(`。查看\\s*@?${username}.*$`, 'i');
    const seePattern = new RegExp(`\\.\\s*See\\s+@?${username}.*$`, 'i');
    bioPart = bioPart.replace(lookPattern, '').replace(seePattern, '');
    bio = bioPart.trim();
  }
  
  return { followersText, threadsCountText, bio };
}

/**
 * Helper to parse the user's Full Name from og:title
 */
function parseOgTitle(title) {
  if (!title) return '';
  const match = title.match(/^(.*?)[（\(]@/);
  if (match) {
    return match[1].trim();
  }
  return title.split('•')[0].split('(')[0].trim();
}

// Excel Sync API
app.get('/api/sync-excel', async (req, res) => {
  console.log(`[Excel Sync Request] Triggered sync to Excel...`);
  
  const syncScript = `node "${path.join(__dirname, 'daily_sync.js')}"`;
  exec(syncScript, (error, stdout, stderr) => {
    const logFilePath = path.join(__dirname, 'sync_log.txt');
    let logContent = '';
    if (fs.existsSync(logFilePath)) {
      logContent = fs.readFileSync(logFilePath, 'utf8').split('\n').slice(-30).join('\n');
    }

    if (error) {
      console.error(`[Excel Sync Error]`, stderr || error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr: stderr,
        stdout: stdout,
        logs: logContent
      });
    }

    let appendedCount = 0;
    let skippedCount = 0;
    let excelLocked = false;

    const appendedMatches = stdout.match(/Appended:/g);
    if (appendedMatches) appendedCount = appendedMatches.length;

    const skippedMatches = stdout.match(/Skipping duplicate post:/g);
    if (skippedMatches) skippedCount = skippedMatches.length;

    if (stdout.includes('Permission Error') || stdout.includes('PermissionError') || stdout.includes('檔案被鎖定')) {
      excelLocked = true;
    }

    console.log(`[Excel Sync Success] Appended: ${appendedCount}, Skipped: ${skippedCount}, Locked: ${excelLocked}`);
    return res.json({
      success: true,
      appendedCount,
      skippedCount,
      excelLocked,
      stdout,
      logs: logContent
    });
  });
});

// Scrape API
app.get('/api/scrape', async (req, res) => {
  let { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username parameter is required' });
  }
  
  username = username.trim().replace(/^@/, '');
  if (!username) {
    return res.status(400).json({ success: false, error: 'Invalid username format' });
  }
  
  console.log(`[Scrape Request] Start scraping for username: @${username}`);
  
  let browser = null;
  try {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    };
    
    try {
      browser = await chromium.launch({ ...launchOptions, channel: 'msedge' });
      console.log('  -> Launched Microsoft Edge');
    } catch (e1) {
      console.warn('  -> Microsoft Edge not available, trying Google Chrome...');
      try {
        browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
        console.log('  -> Launched Google Chrome');
      } catch (e2) {
        console.error('  -> Failed to launch Chrome or Edge', e2.message);
        throw new Error('No compatible browser installed on server (requires Chrome or Edge)');
      }
    }
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    
    const targetUrl = `https://www.threads.net/@${username}?hl=zh-tw`;
    console.log(`  -> Navigating to ${targetUrl}`);
    const navResponse = await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 40000
    });
    
    const navStatus = navResponse ? navResponse.status() : null;
    console.log(`  -> Navigation completed with status: ${navStatus}`);
    
    if (navStatus === 404) {
      await browser.close();
      return res.status(404).json({ success: false, error: `User @${username} was not found on Threads.` });
    }
    
    await page.waitForTimeout(4000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl === 'https://www.threads.com/' || currentUrl === 'https://www.threads.com') {
      await browser.close();
      return res.status(403).json({ success: false, error: 'Access denied or redirected. Threads might be blocking anonymous access for this user.' });
    }
    
    const title = await page.title();
    if (title === 'Threads' || title.toLowerCase().includes('page not found') || title.toLowerCase().includes('無法預覽')) {
      await browser.close();
      return res.status(404).json({ success: false, error: `User @${username} not found, or profile is private/inaccessible.` });
    }
    
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content').catch(() => null);
    const ogImg = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
    
    // Extract edges from embedded JSON
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
            break;
          }
        } catch (e) {}
      }
    }
    
    await browser.close();
    browser = null; // Mark as closed
    
    const fullName = parseOgTitle(ogTitle || title);
    const { followersText, threadsCountText, bio } = parseOgDescription(ogDesc, username);
    
    const userData = {
      username,
      fullName: fullName || username,
      followersText: followersText || '0 粉絲',
      threadsCountText: threadsCountText || '0 則貼文',
      bio: bio || '',
      avatar: ogImg || ''
    };
    
    const posts = [];
    const edges = targetEdges || [];
    
    for (const edge of edges) {
      const node = edge.node;
      if (!node || !node.thread_items) continue;
      
      const threadItems = node.thread_items;
      const items = [];
      
      for (const item of threadItems) {
        const post = item.post;
        if (!post) continue;
        
        let text = post.caption?.text || '';
        const snippetText = post.text_post_app_info?.snippet_attachment_info?.text_fragments?.fragments?.[0]?.plaintext;
        if (snippetText && snippetText.length > text.length) {
          text = snippetText;
        }
        
        const media = [];
        if (post.media_type === 1) {
          const imgUrl = post.image_versions2?.candidates?.[0]?.url;
          if (imgUrl) media.push({ type: 'image', url: imgUrl });
        } else if (post.media_type === 2) {
          const videoUrl = post.video_versions?.[0]?.url;
          const thumbnail = post.image_versions2?.candidates?.[0]?.url;
          if (videoUrl) media.push({ type: 'video', url: videoUrl, thumbnail });
        } else if (post.media_type === 8 && post.carousel_media) {
          for (const cm of post.carousel_media) {
            const img = cm.image_versions2?.candidates?.[0]?.url;
            const vid = cm.video_versions?.[0]?.url;
            if (vid) {
              media.push({ type: 'video', url: vid, thumbnail: img });
            } else if (img) {
              media.push({ type: 'image', url: img });
            }
          }
        }
        
        items.push({
          id: post.id,
          code: post.code,
          url: `https://www.threads.net/t/${post.code}`,
          text,
          likeCount: post.like_count || 0,
          replyCount: post.text_post_app_info?.direct_reply_count || post.reply_count || 0,
          takenAt: post.taken_at,
          date: new Date(post.taken_at * 1000).toISOString(),
          media
        });
      }
      
      if (items.length > 0) {
        posts.push({
          threadId: node.id,
          items
        });
      }
    }
    
    console.log(`[Scrape Success] Found user details and ${posts.length} thread(s) for @${username}`);
    return res.json({
      success: true,
      user: userData,
      posts
    });
    
  } catch (error) {
    console.error(`[Scrape Error] Failed to scrape @${username}:`, error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback to index.html for spa
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(` Threads Scraper running at:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`========================================`);
});
