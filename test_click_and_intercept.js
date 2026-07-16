const { chromium } = require('playwright-core');
const fs = require('fs');

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
  
  // Set up response intercept
  page.on('response', async (response) => {
    const resUrl = response.url();
    if (resUrl.includes('/graphql/query')) {
      try {
        const text = await response.text();
        console.log(`Intercepted GraphQL: ${resUrl.slice(0, 50)}. Size: ${text.length}`);
        if (text.includes('荔枝') || text.includes('水果') || text.includes('釋迦')) {
          fs.writeFileSync('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\0d6a4d2c-9120-4f7a-9278-0a6ae731dac0\\scratch\\intercepted_seemore_graphql.json', text);
          console.log('  --> Saved graphql response to intercepted_seemore_graphql.json');
        }
      } catch (e) {}
    }
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(2000);
    
    console.log('Current URL before click:', page.url());
    console.log('Page Title before click:', await page.title());
    
    // Find "閱讀全文" button
    const seeMoreLocator = page.locator('text="閱讀全文"');
    const count = await seeMoreLocator.count();
    console.log(`Found ${count} "閱讀全文" button(s).`);
    
    if (count > 0) {
      console.log('Forced clicking first button...');
      await seeMoreLocator.first().click({ force: true }).catch(err => console.log('Click error:', err.message));
      await page.waitForTimeout(4000); // Wait for API response and render
    }
    
    console.log('Current URL after click:', page.url());
    console.log('Page Title after click:', await page.title());
    
    // Check if body text has changed
    const bodyText = await page.innerText('body');
    fs.writeFileSync('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\0d6a4d2c-9120-4f7a-9278-0a6ae731dac0\\scratch\\body_after_click.txt', bodyText);
    console.log('Saved body text to body_after_click.txt. Length:', bodyText.length);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
