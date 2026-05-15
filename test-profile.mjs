import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/login');
await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, { timeout: 15000 });
await page.locator('input').nth(0).fill('locadmin1');
await page.locator('input[type="password"]').fill('Admin@123');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.goto('http://localhost:5173/profile');
await new Promise(r => setTimeout(r, 1500));
writeFileSync('D:/Projects/AI KMS/profile-before.png', await page.screenshot());
console.log('done');
await browser.close();
