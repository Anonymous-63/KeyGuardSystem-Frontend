import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5173/login');
await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, { timeout: 15000 });
await page.locator('input').nth(0).fill('locadmin1');
await page.locator('input[type="password"]').fill('Admin@123');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/dashboard', { timeout: 10000 });
await new Promise(r => setTimeout(r, 800));

// open sidebar
await page.locator('button[aria-label="Menu"]').click();
await new Promise(r => setTimeout(r, 400));
writeFileSync('D:/Projects/AI KMS/mobile-sidebar.png', await page.screenshot());

// click location trigger to open dropdown
const locBtn = page.locator('aside button').filter({ hasText: /Head Office|Branch Office|All Locations/ }).first();
await locBtn.click();
await new Promise(r => setTimeout(r, 300));
writeFileSync('D:/Projects/AI KMS/mobile-sidebar-open.png', await page.screenshot());

console.log('done');
await browser.close();
