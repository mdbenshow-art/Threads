const { chromium } = require('playwright-core');

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
    await page.waitForTimeout(2000);
    
    // Check if "閱讀全文" is present and click it using force: true
    console.log('Checking for "閱讀全文" button...');
    const seeMoreLocator = page.locator('text="閱讀全文"');
    const count = await seeMoreLocator.count();
    console.log(`Found ${count} "閱讀全文" button(s).`);
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        console.log(`Forced clicking button #${i+1}...`);
        await seeMoreLocator.nth(i).click({ force: true, timeout: 3000 }).catch(err => console.log('Click error:', err.message));
        await page.waitForTimeout(500);
      }
    }
    
    // Wait a moment for layout update
    await page.waitForTimeout(2000);
    
    // Extract the main post content after clicking
    console.log('Querying post text...');
    const postText = await page.evaluate(() => {
      const art = document.querySelector('div[role="article"], article');
      if (!art) return 'Article not found';
      
      const textSpans = [];
      art.querySelectorAll('span').forEach(s => {
        const text = s.innerText.trim();
        // Filter out usernames, date strings, counts, etc.
        if (text && text.length > 5 && !text.includes('粉絲') && !text.includes('回覆') && !text.includes('追蹤') && !text.includes('閱讀全文')) {
          textSpans.push(text);
        }
      });
      return textSpans.join('\n');
    });
    
    console.log('\n--- EXTRACTED POST CONTENT ---');
    console.log(postText);
    console.log('------------------------------');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
