const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const url = 'https://www.threads.com/@abc89151207/post/DafzV0JD66o?hl=zh-tw';
  console.log(`Starting crawl of: ${url}`);
  
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  let targetJson = null;
  
  page.on('response', async (response) => {
    const resUrl = response.url();
    if (resUrl.includes('/graphql/query')) {
      try {
        const text = await response.text();
        if (text.includes('DafzV0JD66o') && text.includes('thread_items')) {
          console.log(`  -> Intercepted target GraphQL query! Size: ${text.length}`);
          targetJson = JSON.parse(text);
        }
      } catch (err) {
        // Ignored
      }
    }
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
    console.log('  -> Page loaded, scrolling to load replies...');
    
    // Scroll down multiple times to trigger lazy loaded items in the thread
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1500);
    }
  } catch (err) {
    console.error('Error during navigation/scroll:', err.message);
  }
  
  await browser.close();
  
  if (!targetJson) {
    console.error('Error: Target GraphQL query was not intercepted.');
    process.exit(1);
  }
  
  const outputPath = path.join(__dirname, 'crawled_thread.json');
  fs.writeFileSync(outputPath, JSON.stringify(targetJson, null, 2));
  console.log(`Successfully saved crawled data to: ${outputPath}`);
})();
