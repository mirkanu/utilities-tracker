// tests/e2e/phase-07-temperature.spec.cjs
// Phase 7 — Temperature overlay E2E spec
// Run: NODE_PATH=/usr/lib/node_modules node tests/e2e/phase-07-temperature.spec.cjs
// Pre-req: source /home/services/.env.production (sets UTILITIES_PASSWORD)

const { chromium } = require('/usr/lib/node_modules/playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'https://utilities.gsdlabs.dev';
// UTILITIES_AUTH_PASSWORD is a CI override; UTILITIES_PASSWORD is the production name.
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

  // ---- Login ----
  console.log('\n--- Login ---');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('PASS: Login succeeded, redirected to', page.url());
  passCount++;

  // ---- Navigate to /oil ----
  console.log('\n--- Navigate to /oil ---');
  await page.goto(BASE_URL + '/oil', { waitUntil: 'networkidle' });
  assert(new URL(page.url()).pathname === '/oil', `URL is /oil (got ${page.url()})`);

  // ---- Test 1: Raw view — temperature toggle hidden ----
  console.log('\n--- Test 1: Raw view — toggle hidden ---');
  // Default landing is Raw view
  const rawToggleCount = await page.locator('button[aria-label="Show temperature overlay"]').count();
  assert(rawToggleCount === 0, 'Temperature toggle is HIDDEN in Raw view');

  // ---- Test 2: Switch to Monthly view — toggle visible and default OFF ----
  console.log('\n--- Test 2: Monthly view — toggle visible + default OFF ---');
  await page.getByRole('button', { name: 'Monthly' }).click();
  await page.waitForTimeout(300);
  const monthlyToggle = page.locator('button[aria-label="Show temperature overlay"]');
  assert(await monthlyToggle.isVisible(), 'Temperature toggle visible in Monthly view');
  assert((await monthlyToggle.getAttribute('aria-checked')) === 'false', 'Temperature toggle defaults to OFF');

  // ---- Test 3: Click toggle ON — aria-checked flips and right axis appears ----
  console.log('\n--- Test 3: Toggle ON — right axis with °C ticks ---');
  await monthlyToggle.click();
  await page.waitForTimeout(400);
  assert((await monthlyToggle.getAttribute('aria-checked')) === 'true', 'Temperature toggle is ON after click');
  // Right axis tick labels end with "°" — Recharts renders them as <text> inside SVG
  const degreeTickCount = await page.locator('svg text').filter({ hasText: /°/ }).count();
  assert(degreeTickCount > 0, 'Right y-axis shows °C ticks when temperature ON (Monthly)');

  // ---- Test 4: Switch to Annual view — state preserved + HDD axis ----
  console.log('\n--- Test 4: Annual view — toggle preserved + HDD axis ---');
  await page.getByRole('button', { name: 'Annual' }).click();
  await page.waitForTimeout(400);
  const annualToggle = page.locator('button[aria-label="Show temperature overlay"]');
  assert(await annualToggle.isVisible(), 'Temperature toggle visible in Annual view');
  assert((await annualToggle.getAttribute('aria-checked')) === 'true', 'Toggle state preserved across view switch');
  // HDD axis label
  const hddLabelCount = await page.locator('svg text').filter({ hasText: /HDD/ }).count();
  assert(hddLabelCount > 0, 'HDD axis label rendered when temperature ON (Annual)');

  // ---- Test 5: Back to Raw — toggle disappears ----
  console.log('\n--- Test 5: Back to Raw — toggle hidden again ---');
  await page.getByRole('button', { name: 'Readings' }).click();
  await page.waitForTimeout(300);
  const rawAgainCount = await page.locator('button[aria-label="Show temperature overlay"]').count();
  assert(rawAgainCount === 0, 'Temperature toggle is HIDDEN again after returning to Raw view');

  await browser.close();
  console.log('\n=== ' + passCount + ' PASS / ' + failCount + ' FAIL ===');

  // Memory hygiene per global CLAUDE.md
  const { execSync } = require('child_process');
  try { execSync('pkill -u claude -f "chrome|chromium" 2>/dev/null || true'); } catch (_) {}

  process.exit(failCount > 0 ? 1 : 0);
})().catch((e) => {
  console.error('UNCAUGHT:', e);
  process.exit(1);
});
