import { chromium } from '../../LearnUp-Web/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('[Playwright] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Set first launch completed to avoid wizard
  await page.addInitScript(() => {
    localStorage.setItem('learnup_first_launch_completed_v1', 'true');
  });

  console.log('[Playwright] Navigating to http://localhost:1420 ...');
  await page.goto('http://localhost:1420/#/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of clean dashboard
  const destDir = path.resolve('C:/Users/kadhir/.gemini/antigravity/brain/32170a7f-1997-4d50-894b-939434151c50/screenshots');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  await page.screenshot({ path: path.join(destDir, 'fixed_dashboard_clean.png') });
  console.log('[Playwright] Saved clean dashboard screenshot.');

  // Click Browse Templates button in sidebar
  console.log('[Playwright] Clicking Browse Templates...');
  const browseBtn = page.locator('button:has-text("Browse Templates")');
  await browseBtn.click();
  await page.waitForTimeout(800);

  // Take screenshot of opened Browse Templates modal
  await page.screenshot({ path: path.join(destDir, 'fixed_browse_templates_modal.png') });
  console.log('[Playwright] Saved fixed Browse Templates modal screenshot.');

  // Also copy to docs/screenshots
  const docsDir = path.resolve('docs/screenshots');
  fs.copyFileSync(path.join(destDir, 'fixed_browse_templates_modal.png'), path.join(docsDir, 'fixed_browse_templates_modal.png'));
  fs.copyFileSync(path.join(destDir, 'fixed_dashboard_clean.png'), path.join(docsDir, 'fixed_dashboard_clean.png'));

  await browser.close();
  console.log('[Playwright] Verification completed successfully!');
}

main().catch((err) => {
  console.error('[Playwright Error]', err);
  process.exit(1);
});
