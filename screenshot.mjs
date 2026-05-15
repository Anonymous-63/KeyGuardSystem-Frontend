import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-web-security'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 900 });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:5175/login', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 15000 });
await page.waitForTimeout(800);
await page.locator('input').first().fill('superadmin');
await page.locator('input[type="password"]').fill('Admin@123');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/dashboard', { timeout: 10000 });

await page.goto('http://localhost:5175/audit', { waitUntil: 'load' });
await page.waitForTimeout(2500);

// Check which select has which options
const selects = page.locator('select');
const count = await selects.count();
console.log('Select count:', count);
for (let i = 0; i < count; i++) {
  const opts = await selects.nth(i).locator('option').allInnerTexts();
  console.log(`Select[${i}]:`, opts.join(' | '));
}

// Filter by WARNING severity (find the right select)
const severitySelect = page.locator('select').filter({ hasText: 'All Severities' });
await severitySelect.selectOption('WARNING');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'D:/Projects/AI KMS/fix2-warning-filter.png' });
console.log('WARNING filter captured');

// Datetime filter test — set "from" to today at 14:00
await severitySelect.selectOption('');
await page.waitForTimeout(300);
const fromDt = page.locator('input[type="datetime-local"]').first();
await fromDt.fill('2026-05-13T14:30');
await page.waitForTimeout(1800);
const rowsAfterFilter = await page.locator('.ag-center-cols-container [role="row"]').count();
console.log('Rows after datetime filter:', rowsAfterFilter);
await page.screenshot({ path: 'D:/Projects/AI KMS/fix4-datetime-filter.png' });
console.log('Datetime filter captured');

// Access tab — verify count badge
await fromDt.fill('');
await page.waitForTimeout(300);
await page.locator('text=Access Decisions').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'D:/Projects/AI KMS/fix5-access-tab.png' });

await browser.close();
