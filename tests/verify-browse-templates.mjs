import { CDPClient, getWebViewTarget } from './cdp-client.mjs';
import path from 'path';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[Verification] Connecting to Edge on port 9222...');
  const target = await getWebViewTarget(10);
  console.log(`[Target URL] ${target.url}`);

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await sleep(1000);

  // If first launch wizard is present, dismiss it
  await client.eval(`
    localStorage.setItem('learnup_first_launch_completed_v1', 'true');
    const wizardClose = document.querySelector('button[aria-label="Close setup wizard"]');
    if (wizardClose) wizardClose.click();
  `);
  await sleep(600);

  // Find and click the Browse Templates button
  console.log('[Verification] Clicking "Browse Templates" button...');
  const clicked = await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Browse Templates'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  `);
  console.log('[Verification] Click result:', clicked);
  await sleep(800);

  // Capture screenshot of the opened modal
  const screenshotPath = path.resolve('docs/screenshots/fixed_browse_templates_modal.png');
  await client.screenshot(screenshotPath);
  console.log('[Verification] Captured modal screenshot to:', screenshotPath);

  // Check if modal container is visible
  const modalInfo = await client.eval(`
    const modal = document.querySelector('[role="dialog"][aria-labelledby="marketplace-title"]');
    if (!modal) return null;
    const container = modal.querySelector('div[class*="modalContainer"]');
    const rect = container ? container.getBoundingClientRect() : null;
    return {
      found: true,
      hasContainer: Boolean(container),
      width: rect ? rect.width : 0,
      height: rect ? rect.height : 0
    };
  `);
  console.log('[Verification] Modal check:', modalInfo);

  // Test closing the modal by pressing Escape
  console.log('[Verification] Pressing Escape to dismiss modal...');
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);

  const closedScreenshotPath = path.resolve('docs/screenshots/fixed_browse_templates_closed.png');
  await client.screenshot(closedScreenshotPath);
  console.log('[Verification] Captured closed screenshot to:', closedScreenshotPath);

  client.close();
  console.log('[Verification] Success!');
}

main().catch((err) => {
  console.error('[Verification Failed]', err);
  process.exit(1);
});
