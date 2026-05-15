const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'screenshots', 'audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="superadmin"]', 'superadmin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log('  ✓', name + '.png');
}

// Click a settings tab regardless of whether it shows short label (mobile) or full (desktop)
async function clickSettingsTab(page, keywords) {
  for (const kw of keywords) {
    const btn = page.locator(`button:has-text("${kw}")`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(500);
      return;
    }
  }
  console.warn('  ⚠ could not find tab:', keywords);
}

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1280, height: 900  },
];

const TABS = [
  { file: 'org',      keywords: ['Org', 'Organization'] },
  { file: 'email',    keywords: ['Email'] },
  { file: 'sms',      keywords: ['SMS'] },
  { file: 'ldap',     keywords: ['LDAP'] },
  { file: 'features', keywords: ['Features'] },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);
    const ctx  = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await login(page);

    // ── Settings — every tab ─────────────────────────────────────────────────
    for (const tab of TABS) {
      await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      if (tab.file !== 'org') await clickSettingsTab(page, tab.keywords);
      await shot(page, `${vp.name}-settings-${tab.file}`);
    }

    // ── Operators list ───────────────────────────────────────────────────────
    await page.goto(BASE + '/operators', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, `${vp.name}-operators-list`);

    // ── Operators Add form ───────────────────────────────────────────────────
    const addBtn = page.locator('button:has-text("Add Operator")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(600);
      await shot(page, `${vp.name}-operators-form`);
      await page.keyboard.press('Escape');
    }

    await ctx.close();
  }

  await browser.close();
  console.log('\nDone →', OUT);
})();
