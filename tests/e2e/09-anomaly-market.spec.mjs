// tests/e2e/09-anomaly-market.spec.mjs
// Phase 9 E2E: anomaly detection on /analytics + market badge on /oil
//
// Uses the shared Playwright daemon per global CLAUDE.md.
// NEVER call chromium.launch() directly — the daemon owns Chromium lifecycle.
//
// Run:
//   set -a; . /home/services/.env.production; set +a
//   NODE_PATH=/usr/lib/node_modules node tests/e2e/09-anomaly-market.spec.mjs

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runPlaywright } = require('/home/services/playwright-daemon/client.js');

const BASE_URL = process.env.E2E_BASE_URL || 'https://utilities.gsdlabs.dev';
// Support both password env var names used in the project
const PASSWORD = process.env.UTILITIES_APP_PASSWORD || process.env.UTILITIES_PASSWORD;

if (!PASSWORD) {
  console.error('UTILITIES_APP_PASSWORD or UTILITIES_PASSWORD not set — source /home/services/.env.production before running');
  process.exit(1);
}

// --- Memory pre-check (mandatory per global CLAUDE.md) ---
// Abort if available RAM < 800MB to avoid OOM when daemon spawns Chromium.
function checkMemory() {
  const availableMB = parseInt(
    execSync("free -m | awk '/Mem:/ {print $7}'", { encoding: 'utf8' }).trim(),
    10,
  );
  if (Number.isNaN(availableMB)) {
    throw new Error('Memory pre-check failed: could not parse free -m output');
  }
  if (availableMB < 800) {
    console.error(`MEMORY-PRECHECK-FAIL: only ${availableMB}MB available, need >= 800MB`);
    console.error('Aborting E2E to avoid OOM. Free memory and retry.');
    process.exit(1);
  }
  console.log(`MEMORY-PRECHECK-OK: ${availableMB}MB available`);
}

// Escape backticks and template interpolation sequences for embedding in script strings.
function escapeForScript(s) {
  return s.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

(async () => {
  checkMemory();

  const safePassword = escapeForScript(PASSWORD);
  const safeBase = escapeForScript(BASE_URL);

  // --- Step 1: Login ---
  // The daemon persists a single browser context across jobs, so login state carries
  // through to subsequent runPlaywright calls in this process.
  await runPlaywright(`
    await page.goto('${safeBase}/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="password"]', '${safePassword}');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 });
    return 'login-ok';
  `);
  console.log('OK login');

  // --- Step 2: /analytics — Anomalies section appears above Year on Year ---
  const analyticsResult = await runPlaywright(`
    await page.goto('${safeBase}/analytics', { waitUntil: 'networkidle' });

    // Confirm Anomalies heading is visible
    const anomaliesHeading = page.locator('h2', { hasText: 'Anomalies' }).first();
    const visible = await anomaliesHeading.isVisible();
    if (!visible) {
      throw new Error('Anomalies h2 heading not visible on /analytics');
    }

    // Confirm Anomalies heading appears ABOVE Year on Year heading (lower y coordinate)
    const anomBox = await anomaliesHeading.boundingBox();
    const yoyHeading = page.locator('h2', { hasText: 'Year on Year' }).first();
    const yoyBox = await yoyHeading.boundingBox();
    if (!anomBox || !yoyBox) {
      throw new Error(
        'Could not measure bounding boxes — anomBox=' + JSON.stringify(anomBox) +
        ', yoyBox=' + JSON.stringify(yoyBox)
      );
    }
    if (anomBox.y >= yoyBox.y) {
      throw new Error(
        'Anomalies must appear ABOVE Year on Year. anomBox.y=' + anomBox.y +
        ', yoyBox.y=' + yoyBox.y
      );
    }

    await page.screenshot({ path: '/tmp/09-analytics.png', fullPage: true });
    return { anomY: anomBox.y, yoyY: yoyBox.y, visible };
  `);
  console.log(
    'OK /analytics — Anomalies heading present and above Year on Year',
    JSON.stringify(analyticsResult),
  );

  // --- Step 3: /oil — MarketBadge on purchase rows ---
  const oilResult = await runPlaywright(`
    await page.goto('${safeBase}/oil', { waitUntil: 'networkidle' });

    // Wait for market badge content to appear (either comparison text or unavailable notice)
    await page.waitForSelector(
      'text=/market avg|Market data unavailable/i',
      { timeout: 15000 }
    );

    const badgeCount = await page
      .locator('text=/market avg|Market data unavailable/i')
      .count();

    if (badgeCount < 1) {
      throw new Error('Expected at least 1 MarketBadge on /oil, found ' + badgeCount);
    }

    await page.screenshot({ path: '/tmp/09-oil.png', fullPage: true });
    return { badgeCount };
  `);
  console.log('OK /oil — ' + oilResult.badgeCount + ' market badges rendered');

  console.log('PHASE-9-E2E-PASS');
})().catch((err) => {
  console.error('PHASE-9-E2E-FAIL', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
