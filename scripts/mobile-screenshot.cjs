const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const MOBILE = { width: 390, height: 844 };   // iPhone 14-ish
const BASE   = 'http://localhost:5173';

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log('saved:', name + '.png');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: MOBILE });
  const page    = await ctx.newPage();

  // ── Login ────────────────────────────────────────────────────────────────
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await shot(page, '01-login');

  await page.fill('input[placeholder="superadmin"]', 'superadmin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, '02-dashboard');

  // ── Operators list ───────────────────────────────────────────────────────
  await page.goto(BASE + '/operators', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '03-operators-list');

  // ── Operators — open Add form ────────────────────────────────────────────
  const addBtn = page.locator('button', { hasText: 'Add Operator' });
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(600);
    await shot(page, '04-operators-add-form');
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '05-settings-org');

  // Click Email tab
  const emailBtn = page.locator('button', { hasText: /Email/ }).first();
  if (await emailBtn.count() > 0) {
    await emailBtn.click();
    await page.waitForTimeout(400);
    await shot(page, '06-settings-email');
  }

  // Click LDAP tab
  const ldapBtn = page.locator('button', { hasText: /LDAP/ }).first();
  if (await ldapBtn.count() > 0) {
    await ldapBtn.click();
    await page.waitForTimeout(400);
    await shot(page, '07-settings-ldap');
  }

  // Click SMS tab
  const smsBtn = page.locator('button', { hasText: /SMS/ }).first();
  if (await smsBtn.count() > 0) {
    await smsBtn.click();
    await page.waitForTimeout(400);
    await shot(page, '08-settings-sms');
  }

  // Click Features tab
  const featBtn = page.locator('button', { hasText: /Features/ }).first();
  if (await featBtn.count() > 0) {
    await featBtn.click();
    await page.waitForTimeout(400);
    await shot(page, '09-settings-features');
  }

  await browser.close();
  console.log('\nAll screenshots saved to:', OUT);
})();
