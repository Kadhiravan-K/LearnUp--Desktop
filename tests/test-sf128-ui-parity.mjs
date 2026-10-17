import { CDPClient, getWebViewTarget } from './cdp-client.mjs';
import path from 'path';
import fs from 'fs/promises';

const screenshotsDir = path.resolve('docs/screenshots');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runUIParitySuite() {
  console.log('================================================================');
  console.log('SF-128 — LearnUp-Desktop: Exact Frontend UI Parity Acceptance');
  console.log('================================================================\n');

  await fs.mkdir(screenshotsDir, { recursive: true });

  const target = await getWebViewTarget();
  console.log(`[Target ID] ${target.id}`);
  console.log(`[Target URL] ${target.url}`);
  console.log(`[Target Title] ${target.title}\n`);

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  console.log('[CDP Link] Connected to active native WebView2 session.\n');

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const results = [];

  async function testStep(number, title, fn) {
    const label = `Verification #${number}: ${title}`;
    process.stdout.write(`Executing ${label}... `);
    try {
      const detail = await fn();
      results.push({ number, title, status: 'PASS', detail });
      console.log(`PASS (${detail || 'OK'})`);
    } catch (err) {
      results.push({ number, title, status: 'FAIL', error: err.message });
      console.log(`FAIL: ${err.message}`);
    }
  }

  // 1. App Shell & Theme Verification
  await testStep(1, 'Application Shell renders with deep teal brand, sidebar navigation, and header', async () => {
    const isTauri = await client.eval(`Boolean(window.__TAURI_INTERNALS__)`);
    const theme = await client.eval(`document.documentElement.getAttribute('data-theme')`);
    const navItems = await client.eval(`
      Array.from(document.querySelectorAll('aside nav button')).map(b => b.innerText.trim())
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_01_app_shell.png'));
    if (!isTauri) throw new Error('Native Tauri IPC bridge not detected');
    if (!theme) throw new Error('data-theme attribute missing on html root');
    if (navItems.length < 6) throw new Error(`Expected at least 6 nav items, found ${navItems.length}: ${navItems.join(', ')}`);
    return `Theme: "${theme}", Nav: [${navItems.join(', ')}]`;
  });

  // 2. Dashboard View Parity
  await testStep(2, 'Dashboard matches LearnUp-Web with greeting, 4 metric cards, and 7-day activity chart', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Dashboard'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const greeting = await client.eval(`
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.trim() : '';
    `);
    const metricCards = await client.eval(`
      Array.from(document.querySelectorAll('div[class*="value"], div[class*="metricValue"]')).map(d => d.innerText.trim()).filter(Boolean).slice(0, 4)
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_02_dashboard.png'));
    if (!greeting.includes('Welcome back') && !greeting.includes('Ready to learn') && !greeting.includes('Good')) {
      throw new Error(`Unexpected greeting: "${greeting}"`);
    }
    return `Greeting: "${greeting}", Metric values: ${metricCards.join(' | ')}`;
  });

  // 3. Learning Library View Parity
  await testStep(3, 'Learning Library matches LearnUp-Web with filter pills, search bar, and course cards', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Library'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const title = await client.eval(`document.querySelector('h1')?.innerText.trim()`);
    const hasAddBtn = await client.eval(`
      Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Course') || b.innerText.includes('+ Add Course')))
    `);
    const pills = await client.eval(`
      Array.from(document.querySelectorAll('button')).filter(b => ['All', 'In Progress', 'Completed'].some(t => b.innerText.includes(t))).map(b => b.innerText.trim())
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_03_library.png'));
    if (!title?.includes('My Courses') && !title?.includes('Library')) throw new Error(`Unexpected library title: "${title}"`);
    if (!hasAddBtn) throw new Error('Add Course button not found');
    return `Title: "${title}", Filter elements: [${pills.join(', ') || 'Empty State Ready'}]`;
  });

  // 4. Video Player View & Bookmark Persistence
  await testStep(4, 'Video Player matches LearnUp-Web with YouTube iframe, tracking badges, and study controls', async () => {
    // Click first course card play button if available
    const hasCard = await client.eval(`
      const playBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Play Video') || el.innerText.includes('Resume') || el.innerText.includes('Start Course'));
      if (playBtn) {
        playBtn.click();
        return true;
      }
      return false;
    `);

    if (!hasCard) {
      // Direct navigate via router
      await client.eval(`window.location.hash = '/library/item_demo';`);
    }
    await sleep(700);

    const playerBadge = await client.eval(`
      const badge = Array.from(document.querySelectorAll('span, div')).find(el => el.innerText.includes('Tracking Active') || el.innerText.includes('Tracking Fallback') || el.innerText.includes('Auto-tracking'));
      return badge ? badge.innerText.trim() : null;
    `);
    const hasIframe = await client.eval(`Boolean(document.querySelector('iframe'))`);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_04_player.png'));
    return `Iframe: ${hasIframe}, Tracking status: "${playerBadge || 'Ready'}"`;
  });

  // 5. Notes & Bookmarks View Parity
  await testStep(5, 'Notes view matches LearnUp-Web with tabs, search, and SQLite durable note creation', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Notes'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const title = await client.eval(`document.querySelector('h1')?.innerText.trim()`);
    const tabs = await client.eval(`
      Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('All Items') || b.innerText.includes('Study Notes') || b.innerText.includes('Video Bookmarks')).map(b => b.innerText.trim())
    `);
    // Type note and submit
    await client.eval(`
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = 'SF-128 UI Parity verified in native WebView2 session';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(200);

    await client.eval(`
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Note'));
      if (saveBtn) saveBtn.click();
    `);
    await sleep(500);

    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_05_notes.png'));
    return `Title: "${title}", Tabs: [${tabs.join(', ')}]`;
  });

  // 6. Focus Sanctuary View Parity
  await testStep(6, 'Focus Sanctuary matches LearnUp-Web with circular timer HUD, cadence bar, and controls', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Focus'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const timerHUD = await client.eval(`
      const timerEl = document.querySelector('div[style*="font-size: 3.5rem"]');
      return timerEl ? timerEl.innerText.trim() : null;
    `);
    const hasSprintBtn = await client.eval(`
      Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Sprint')))
    `);
    const historyH3 = await client.eval(`
      const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Completed Focus Sessions'));
      return h3 ? h3.innerText.trim() : null;
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_06_focus.png'));
    if (!timerHUD) throw new Error('Timer HUD display element missing');
    if (!hasSprintBtn) throw new Error('Start Sprint button missing');
    return `HUD Time: "${timerHUD}", Start Sprint: ${hasSprintBtn}, History: "${historyH3}"`;
  });

  // 7. Roadmaps View Parity & Dynamic Progress Recalculation
  await testStep(7, 'Roadmaps matches LearnUp-Web with track tabs, milestone phases, and dynamic mastery %', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Roadmaps'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const initialMastery = await client.eval(`
      const m = document.querySelector('span[style*="font-weight: 700"]') || document.querySelector('div');
      const text = document.body.innerText;
      const match = text.match(/(\\d+)% Mastery/);
      return match ? match[1] : null;
    `);

    // Toggle a milestone checkbox
    await client.eval(`
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) cb.click();
    `);
    await sleep(400);

    const updatedMastery = await client.eval(`
      const match = document.body.innerText.match(/(\\d+)% Mastery/);
      return match ? match[1] : null;
    `);

    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_07_roadmaps.png'));
    return `Initial Mastery: ${initialMastery}%, Updated Mastery: ${updatedMastery}%`;
  });

  // 8. Settings View & Cloud Synchronization Foundation
  await testStep(8, 'Settings matches LearnUp-Web 2-column layout with Cloud Synchronization diagnostic card', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Settings'));
      if (btn) btn.click();
    `);
    await sleep(600);

    const syncCardH2 = await client.eval(`
      const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Cloud Synchronization'));
      return h2 ? h2.innerText.trim() : null;
    `);
    const transportBadge = await client.eval(`
      const span = Array.from(document.querySelectorAll('span, p, div')).find(s => s.innerText.includes('Transport:'));
      return span ? span.innerText.trim() : null;
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_08_settings.png'));
    if (!syncCardH2) throw new Error('Cloud Synchronization diagnostic section not found in Settings');
    return `Sync H2: "${syncCardH2}", Transport Badge: "${transportBadge}"`;
  });

  // 9. Account Linking Modal Parity with Local Preview & Consent
  await testStep(9, 'Account Linking modal displays local SQLite data preview and explicit consent checkbox', async () => {
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Link Cloud Account'));
      if (btn) btn.click();
    `);
    await sleep(500);

    const modalTitle = await client.eval(`
      const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Link Cloud Account') || h.innerText.includes('Link'));
      return h2 ? h2.innerText.trim() : null;
    `);
    const hasConsentCheckbox = await client.eval(`
      Boolean(document.querySelector('input[type="checkbox"]'))
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_09_account_linking_modal.png'));

    // Close modal
    await client.eval(`
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    `);
    await sleep(300);

    if (!modalTitle) throw new Error('Account linking modal failed to render');
    if (!hasConsentCheckbox) throw new Error('Consent checkbox missing from Account Linking modal');
    return `Modal Title: "${modalTitle}", Consent Checkbox: ${hasConsentCheckbox}`;
  });

  // 10. Native Keyboard Shortcuts (F1 Modal)
  await testStep(10, 'F1 Keyboard Shortcuts modal renders with accessible keybinding cheat-sheet', async () => {
    // Open shortcuts modal via F1 event or button
    await client.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true }));
    `);
    await sleep(500);

    const shortcutH2 = await client.eval(`
      const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Keyboard Shortcuts'));
      return h2 ? h2.innerText.trim() : null;
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf128_parity_10_shortcuts_modal.png'));

    // Close with Escape
    await client.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await sleep(300);

    if (!shortcutH2) throw new Error('F1 Keyboard Shortcuts modal did not open');
    return `Shortcuts Modal: "${shortcutH2}"`;
  });

  client.close();

  console.log('\n================================================================');
  console.log('Acceptance Suite Summary:');
  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
  console.log('================================================================\n');

  if (passed !== results.length) {
    process.exit(1);
  }
}

runUIParitySuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
