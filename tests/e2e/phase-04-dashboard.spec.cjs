// tests/e2e/phase-04-dashboard.spec.cjs
// Phase 4 — Dashboard + bottom nav + mobile QA E2E spec
// Run: NODE_PATH=/usr/lib/node_modules node tests/e2e/phase-04-dashboard.spec.cjs
// Pre-req: source /home/services/.env.production (sets UTILITIES_AUTH_PASSWORD)

const { chromium } = require('/usr/lib/node_modules/playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'https://utilities.gsdlabs.dev';
const PASSWORD = process.env.UTILITIES_AUTH_PASSWORD;

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
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X portrait
  });
  const page = await context.newPage();

  // ---- Login ----
  console.log('\n--- Login ---');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
  // Login form: <Input name="password" type="password" ...>
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page (useEffect pushes to /oil after state.ok)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('PASS: Login succeeded, redirected to', page.url());
  passCount++;

  // ---- TEST 1: / renders dashboard (no redirect to /oil) ----
  console.log('\n--- Test 1: / renders dashboard ---');
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  assert(new URL(page.url()).pathname === '/', `URL stays at / (got ${page.url()})`);
  const h1Text = await page.locator('h1').first().textContent();
  assert(h1Text?.trim() === 'Home', `H1 is "Home" (got "${h1Text}")`);

  // ---- TEST 2: Both stat card labels present ----
  console.log('\n--- Test 2: Stat card labels visible ---');
  const oilLabel = await page.getByText('Oil', { exact: true }).first().isVisible();
  const elecLabel = await page.getByText('Electricity', { exact: true }).first().isVisible();
  assert(oilLabel, 'Oil stat card label visible on dashboard');
  assert(elecLabel, 'Electricity stat card label visible on dashboard');

  // ---- TEST 3: Detail links present ----
  console.log('\n--- Test 3: Detail links present ---');
  assert(await page.getByText('View Oil details →').isVisible(), 'View Oil details link visible');
  assert(await page.getByText('View Electricity details →').isVisible(), 'View Electricity details link visible');

  // ---- TEST 4: No horizontal overflow on / ----
  console.log('\n--- Test 4: No horizontal overflow on / ---');
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientW = await page.evaluate(() => document.documentElement.clientWidth);
  assert(scrollW <= clientW + 1, `No horizontal overflow on / (scrollW=${scrollW}, clientW=${clientW})`);

  // ---- TEST 5: Bottom nav has 3 tabs ----
  console.log('\n--- Test 5: Bottom nav has 3 tabs ---');
  const navLinks = await page.locator('nav[aria-label="Main navigation"] a').count();
  assert(navLinks === 3, `BottomNav has 3 tabs (got ${navLinks})`);

  // ---- TEST 6: Home tab is the ONLY active tab on / ----
  console.log('\n--- Test 6: Exclusive active tab on / ---');
  const activeOnHome = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').count();
  assert(activeOnHome === 1, `Exactly one active nav tab on / (got ${activeOnHome})`);
  const activeHomeLabel = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').textContent();
  assert(activeHomeLabel?.includes('Home'), `Active tab on / is "Home" (got "${activeHomeLabel}")`);

  // ---- TEST 7: Oil tab active on /oil, Home tab NOT active ----
  console.log('\n--- Test 7: Exclusive active tab on /oil ---');
  await page.goto(BASE_URL + '/oil', { waitUntil: 'networkidle' });
  const activeOnOil = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').count();
  assert(activeOnOil === 1, `Exactly one active nav tab on /oil (got ${activeOnOil})`);
  const activeOilLabel = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').textContent();
  assert(
    activeOilLabel?.includes('Oil') && !activeOilLabel?.includes('Home'),
    `Active tab on /oil is Oil (not Home). Got: "${activeOilLabel}"`
  );

  // ---- TEST 8: No horizontal overflow on /oil ----
  console.log('\n--- Test 8: No horizontal overflow on /oil ---');
  const oilScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const oilClientW = await page.evaluate(() => document.documentElement.clientWidth);
  assert(oilScrollW <= oilClientW + 1, `No horizontal overflow on /oil (scrollW=${oilScrollW}, clientW=${oilClientW})`);

  // ---- TEST 9: Electricity tab active on /electricity ----
  console.log('\n--- Test 9: Exclusive active tab on /electricity ---');
  await page.goto(BASE_URL + '/electricity', { waitUntil: 'networkidle' });
  const activeOnElec = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').count();
  assert(activeOnElec === 1, `Exactly one active nav tab on /electricity (got ${activeOnElec})`);
  const activeElecLabel = await page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').textContent();
  assert(
    activeElecLabel?.includes('Electricity') && !activeElecLabel?.includes('Home'),
    `Active tab on /electricity is Electricity (not Home). Got: "${activeElecLabel}"`
  );

  // ---- TEST 10: No horizontal overflow on /electricity ----
  console.log('\n--- Test 10: No horizontal overflow on /electricity ---');
  const elecScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const elecClientW = await page.evaluate(() => document.documentElement.clientWidth);
  assert(elecScrollW <= elecClientW + 1, `No horizontal overflow on /electricity (scrollW=${elecScrollW}, clientW=${elecClientW})`);

  // ---- TEST 11: Bottom nav tap targets >= 44px tall ----
  console.log('\n--- Test 11: Nav row >= 44px tall ---');
  const navRow = await page.locator('nav[aria-label="Main navigation"] > div').first().boundingBox();
  assert(navRow && navRow.height >= 44, `Nav row >= 44px tall (got ${navRow?.height}px)`);

  // ---- TEST 12: Skeleton renders instantly on navigation to /, /oil, /electricity ----
  // Throttles the document response so loading.tsx skeleton is visible before data arrives.
  console.log('\n--- Test 12: Skeleton visible on route transitions ---');
  const skeletonRoutes = ['/', '/oil', '/electricity'];
  for (const route of skeletonRoutes) {
    // Step away first so the next goto() is a genuine route transition (not a no-op).
    const intermediary = route === '/' ? '/oil' : '/';
    await page.goto(BASE_URL + intermediary, { waitUntil: 'networkidle' });

    // Throttle the target document response by ~1500ms so the skeleton is on screen
    // long enough to assert against. Match the bare route and any RSC payload requests.
    const targetPath = route;
    await page.route(BASE_URL + targetPath + '**', async (r) => {
      await new Promise((res) => setTimeout(res, 1500));
      await r.continue();
    });

    // waitUntil:'commit' resolves as soon as the navigation response headers arrive —
    // exactly when Next.js App Router has the loading.tsx skeleton on screen.
    await page.goto(BASE_URL + targetPath, { waitUntil: 'commit' });

    // Assert skeleton presence while the throttled response is still in flight.
    // The shadcn Skeleton component applies the Tailwind 'animate-pulse' class.
    const skeletonCount = await page.locator('.animate-pulse').count();
    assert(
      skeletonCount > 0,
      `Skeleton (.animate-pulse) visible on navigation to ${route} (got ${skeletonCount} elements)`
    );

    // Clean up: stop throttling and let the page settle before the next iteration.
    await page.unroute(BASE_URL + targetPath + '**');
    await page.waitForLoadState('networkidle');
  }

  // ---- TEST 13: Screenshots for human checkpoint ----
  console.log('\n--- Test 13: Capturing screenshots ---');
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'tests/e2e/artifacts/phase-04-home-375.png', fullPage: true });
  console.log('PASS: Screenshot saved: tests/e2e/artifacts/phase-04-home-375.png');
  passCount++;

  await page.goto(BASE_URL + '/oil', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'tests/e2e/artifacts/phase-04-oil-375.png', fullPage: true });
  console.log('PASS: Screenshot saved: tests/e2e/artifacts/phase-04-oil-375.png');
  passCount++;

  await page.goto(BASE_URL + '/electricity', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'tests/e2e/artifacts/phase-04-electricity-375.png', fullPage: true });
  console.log('PASS: Screenshot saved: tests/e2e/artifacts/phase-04-electricity-375.png');
  passCount++;

  await browser.close();

  console.log(`\n=== RESULTS: ${passCount} passed, ${failCount} failed ===`);
  if (failCount > 0) {
    console.error('SOME ASSERTIONS FAILED — see FAIL: lines above');
    process.exit(1);
  }
  console.log('\n=== ALL ASSERTIONS PASSED ===');
})().catch((e) => {
  console.error('UNCAUGHT:', e);
  process.exit(1);
});
