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

(async () => {
  const url = 'https://www.threads.com/@abc89151207/post/Da0UctUj5F3?hl=zh-tw';
  console.log(`Loading page: ${url}`);
  
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(3000);
    
    console.log('Extracting HTML and searching for embedded JSON...');
    const html = await page.content();
    
    const regex = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let targetObj = null;
    
    while ((match = regex.exec(html)) !== null) {
      const content = match[1];
      if (content.includes('Da0UctUj5F3') && content.includes('thread_items')) {
        try {
          const parsed = JSON.parse(content);
          const edges = findEdges(parsed);
          if (edges) {
            targetObj = edges;
            console.log(`Found target JSON with ${edges.length} edges.`);
            break;
          }
        } catch (e) {}
      }
    }
    
    if (!targetObj) {
      console.error('Error: Could not find thread JSON.');
      process.exit(1);
    }
    
    const rawPosts = [];
    targetObj.forEach((edge) => {
      const threadItems = edge.node?.thread_items || [];
      threadItems.forEach((item) => {
        const post = item.post;
        if (post && post.user?.username === 'abc89151207') {
          rawPosts.push(post);
        }
      });
    });
    
    rawPosts.sort((a, b) => a.taken_at - b.taken_at);
    
    console.log(`Found ${rawPosts.length} posts by @abc89151207.`);
    
    const contents = rawPosts.map((post, idx) => {
      // Logic: Use snippet plaintext if available, else caption text
      let text = post.caption?.text || '';
      const snippetText = post.text_post_app_info?.snippet_attachment_info?.text_fragments?.fragments?.[0]?.plaintext;
      if (snippetText && snippetText.length > text.length) {
        text = snippetText;
      }
      
      // Title is the first line of the main post
      const title = text.split('\n')[0].trim().slice(0, 50);
      
      return {
        postNumber: idx + 1,
        code: post.code,
        title,
        text,
        date: new Date(post.taken_at * 1000).toLocaleString('zh-TW')
      };
    });
    
    const mainTitle = contents[0].title;
    const fullContent = contents.map(c => c.text).join('\n\n');
    
    const draftData = {
      title: mainTitle,
      author: '農民日常',
      postsCount: contents.length,
      contents,
      fullContent
    };
    
    const outputPath = path.join(__dirname, 'post_draft_Da0UctUj5F3.json');
    fs.writeFileSync(outputPath, JSON.stringify(draftData, null, 2));
    console.log(`Saved draft data to: ${outputPath}`);
    
    console.log('\n================ DRAFT PREVIEW (WITH FULL TEXT) ================');
    console.log(`標題 (Title): ${draftData.title}`);
    console.log(`總貼文數 (Posts Count): ${draftData.postsCount}`);
    console.log('\n--- 貼文 #1 內容全文 (Post #1 Full Content) ---');
    console.log(draftData.contents[0].text);
    console.log('================================================================');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
