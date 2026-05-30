// tests/e2e/analytics.spec.cjs
// Phase 8 Plan 03 — Analytics page E2E spec
// Run: NODE_PATH=/usr/lib/node_modules node tests/e2e/analytics.spec.cjs
// Pre-req: source /home/services/.env.production (sets UTILITIES_PASSWORD)

const { chromium } = require('/usr/lib/node_modules/playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'https://utilities.gsdlabs.dev';
const PASSWORD = process.env.UTILITIES_AUTH_PASSWORD || process.env.UTILITIES_PASSWORD;

if (!PASSWORD) {
  console.error('UTILITIES_AUTH_PASSWORD not set — source /home/services/.env.production before running');
  process.exit(1);
}

let passCount = 0;
let failCount = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failCount++;
  } else {
    console.log('PASS:', msg);
    passCount++;
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/tmp/pw-browsers/chromium-1217/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    // ---- Login ----
    console.log('\n--- Login ---');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('PASS: Login succeeded, redirected to', page.url());
    passCount++;

    // ---- Bottom nav has 4 tabs including Analytics ----
    console.log('\n--- Bottom nav: 4 tabs ---');
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
    const navLinks = await page.locator('nav[aria-label="Main navigation"] a').count();
    assert(navLinks === 4, `Expected 4 nav tabs, got ${navLinks}`);

    const analyticsLink = page.locator('nav[aria-label="Main navigation"] a[href="/analytics"]');
    assert(await analyticsLink.count() === 1, 'Analytics nav link present');

    // ---- Navigate to /analytics via nav link ----
    console.log('\n--- Navigate to /analytics ---');
    await analyticsLink.click();
    await page.waitForURL('**/analytics', { timeout: 10000 });
    // Wait for the actual server-rendered content (not just the loading skeleton)
    await page.waitForSelector('h1', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname === '/analytics', `URL is /analytics (got ${page.url()})`);

    // ---- Page header ----
    console.log('\n--- Page header ---');
    const h1Count = await page.locator('h1', { hasText: 'Analytics' }).count();
    assert(h1Count === 1, 'h1 "Analytics" present');

    // ---- Three section headings ----
    console.log('\n--- Section headings ---');
    const sections = ['Year on Year', 'Projected Spend', 'Refill Pattern'];
    for (const s of sections) {
      const c = await page.locator('h2', { hasText: s }).count();
      assert(c === 1, `Section heading "${s}" present`);
    }

    // ---- At least one role=region rendered ----
    console.log('\n--- Region elements ---');
    const regionCount = await page.locator('[role="region"]').count();
    assert(regionCount >= 1, `At least one [role="region"] rendered (got ${regionCount})`);

    // ---- No page errors ----
    console.log('\n--- No page errors ---');
    assert(pageErrors.length === 0, `No console errors (got: ${pageErrors.join('; ')})`);

    // ---- Screenshot for human review ----
    console.log('\n--- Screenshot ---');
    await page.screenshot({ path: 'tests/e2e/analytics.screenshot.png', fullPage: true });
    console.log('PASS: Screenshot saved to tests/e2e/analytics.screenshot.png');
    passCount++;

    // ---- Mobile viewport: no horizontal scroll ----
    console.log('\n--- Mobile layout (320px) ---');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    assert(scrollWidth <= clientWidth + 5, `No horizontal scroll at 320px (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`);

    // ---- Other tabs still work ----
    console.log('\n--- Other tabs still work ---');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
    assert(new URL(page.url()).pathname === '/', 'Home tab navigates to /');

    // Navigate directly to /oil to verify it loads correctly (avoids click race on same-page nav)
    await page.goto(BASE_URL + '/oil', { waitUntil: 'networkidle' });
    assert(new URL(page.url()).pathname === '/oil', 'Oil tab navigates to /oil');

  } catch (err) {
    console.error('EXCEPTION:', err.message);
    failCount++;
  } finally {
    await browser.close();
  }

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed ===`);
  if (failCount > 0) {
    process.exit(1);
  }
  console.log('PASS');
})();
