/**
 * Phase 1 E2E Verification — Utilities Tracker
 * Tests all 5 Phase 1 success criteria against live deployment
 * Run: NODE_PATH=/usr/lib/node_modules node scripts/e2e-phase-01.js
 */

const { chromium } = require('/usr/lib/node_modules/playwright');

const BASE_URL = 'https://utilities.gsdlabs.dev';
const PASSWORD = process.env.UTILITIES_PASSWORD;

if (!PASSWORD) {
  console.error('ERROR: UTILITIES_PASSWORD env var not set');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/home/claude/.cache/ms-playwright/chromium-1217/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 viewport — mobile-first
  });
  const page = await context.newPage();

  try {
    // ── CRITERION 1: Protected route redirect ──────────────────────────────
    console.log('\n[1] Unauthenticated user is redirected to /login');
    await page.goto(`${BASE_URL}/oil`, { waitUntil: 'networkidle' });
    const redirectedUrl = page.url();
    assert(
      redirectedUrl.includes('/login'),
      `Visiting /oil redirects to /login (got: ${redirectedUrl})`
    );

    // ── CRITERION 1a: Login page renders correctly ─────────────────────────
    console.log('\n[1a] Login page renders');
    const heading = await page.locator('h1').textContent().catch(() => '');
    assert(heading?.includes('Utilities'), `H1 heading contains "Utilities" (got: "${heading}")`);

    // ── Login with wrong password ──────────────────────────────────────────
    console.log('\n[1b] Wrong password shows inline error');
    await page.fill('input[name="password"]', 'wrong-password-abc');
    await page.click('button:has-text("Sign in")');
    await page.waitForSelector('#password-error', { timeout: 5000 }).catch(() => {});
    const errorText = await page.locator('#password-error').textContent().catch(() => '');
    assert(
      errorText?.includes('Incorrect password'),
      `Error message shown for wrong password (got: "${errorText}")`
    );
    const stillOnLogin = page.url().includes('/login');
    assert(stillOnLogin, 'Wrong password does not redirect (stays on /login)');

    // ── CRITERION 1 (continued): Log in with correct password ──────────────
    console.log('\n[1c] Correct password logs in and shows Oil section');
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE_URL}/oil`, { timeout: 10000 });
    const onOilPage = page.url().includes('/oil');
    assert(onOilPage, 'Correct password redirects to /oil');

    // ── CRITERION 4: Mobile layout — bottom nav visible ───────────────────
    console.log('\n[4] Mobile layout — bottom nav visible');
    const navVisible = await page.locator('nav[aria-label="Main navigation"]').isVisible();
    assert(navVisible, 'Bottom navigation bar is visible');

    const oilTab = page.locator('a[href="/oil"]');
    const oilTabExists = await oilTab.isVisible();
    assert(oilTabExists, 'Oil tab link is visible in bottom nav');

    const electricityTab = page.locator('a[href="/electricity"]');
    const electricityTabExists = await electricityTab.isVisible();
    assert(electricityTabExists, 'Electricity tab link is visible in bottom nav');

    // ── CRITERION 5: Navigate to Electricity ─────────────────────────────
    console.log('\n[5] Navigation: Oil → Electricity → Oil');
    await page.click('a[href="/electricity"]');
    await page.waitForURL(`${BASE_URL}/electricity`, { timeout: 5000 });
    const onElectricity = page.url().includes('/electricity');
    assert(onElectricity, 'Tapping Electricity tab navigates to /electricity');

    const electricityHeading = await page.locator('h1').textContent().catch(() => '');
    assert(
      electricityHeading?.includes('Electricity'),
      `Electricity page heading contains "Electricity" (got: "${electricityHeading}")`
    );

    // Navigate back to Oil
    await page.click('a[href="/oil"]');
    await page.waitForURL(`${BASE_URL}/oil`, { timeout: 5000 });
    const backOnOil = page.url().includes('/oil');
    assert(backOnOil, 'Tapping Oil tab navigates back to /oil');

    const oilHeading = await page.locator('h1').textContent().catch(() => '');
    assert(
      oilHeading?.includes('Oil'),
      `Oil page heading contains "Oil" (got: "${oilHeading}")`
    );

    // ── CRITERION 1 (session persistence): Reload stays logged in ─────────
    console.log('\n[1d] Session persists across reload');
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = page.url();
    assert(
      afterReload.includes('/oil'),
      `After reload, user stays on /oil (not redirected to login) — URL: ${afterReload}`
    );

    // ── CRITERION 2: Logout ───────────────────────────────────────────────
    console.log('\n[2] Logout returns to /login');
    const logoutButton = page.locator('button:has-text("Log out")').first();
    const logoutVisible = await logoutButton.isVisible().catch(() => false);
    assert(logoutVisible, 'Logout button is visible in root layout');

    if (logoutVisible) {
      await logoutButton.click();
      await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
      assert(page.url().includes('/login'), 'Logout redirects to /login');

      // Verify session destroyed
      await page.goto(`${BASE_URL}/oil`, { waitUntil: 'networkidle' });
      assert(page.url().includes('/login'), 'After logout, /oil redirects to /login (session destroyed)');
    }

    // ── CRITERION 3: Public HTTPS URL ─────────────────────────────────────
    console.log('\n[3] App is accessible via HTTPS');
    assert(BASE_URL.startsWith('https://'), 'App URL uses HTTPS');

  } catch (err) {
    console.error('\nUNEXPECTED ERROR:', err.message);
    failed++;
  } finally {
    await browser.close();
  }

  // ── Results ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Phase 1 E2E Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('PHASE 1 VERIFICATION FAILED — Fix issues before marking phase complete');
    process.exit(1);
  } else {
    console.log('ALL PHASE 1 CRITERIA VERIFIED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
