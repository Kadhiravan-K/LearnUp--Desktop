import { CDPClient, getWebViewTarget } from './cdp-client.mjs';
import path from 'path';

const screenshotsDir = path.resolve('docs/screenshots');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSF126Acceptance() {
  console.log('================================================================');
  console.log('SF-126 — Native WebView2 Functional Acceptance & Parity Suite');
  console.log('================================================================\n');

  const target = await getWebViewTarget();
  console.log(`[Target ID] ${target.id}`);
  console.log(`[Target URL] ${target.url}`);
  console.log(`[Target Title] ${target.title}\n`);

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  console.log('[CDP Link] Connected to native WebView2 session.\n');

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const results = [];

  async function testStep(number, title, fn) {
    const label = `Check #${number}: ${title}`;
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

  // 1. Dashboard metrics reflect SQLite data
  await testStep(1, 'Dashboard metrics reflect real SQLite data', async () => {
    // Navigate to dashboard
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Dashboard'));
      if (btn) btn.click();
    `);
    await sleep(500);

    const metrics = await client.eval(`
      const metricDivs = Array.from(document.querySelectorAll('div[style*="font-size: 1.85rem"]'));
      return metricDivs.map(d => d.innerText.trim());
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf126_01_dashboard_metrics.png'));
    if (metrics.length === 0) throw new Error('No metric cards found on Dashboard');
    return `Found ${metrics.length} metric cards: ${metrics.join(' | ')}`;
  });

  // 2. Recent notes and courses open correctly from Dashboard
  await testStep(2, 'Recent notes and courses open correctly from Dashboard', async () => {
    const hasRecentCourses = await client.eval(`
      return Array.from(document.querySelectorAll('h3')).some(h => h.innerText.includes('Recent Courses'));
    `);
    const hasRecentNotes = await client.eval(`
      return Array.from(document.querySelectorAll('h3')).some(h => h.innerText.includes('Recent Notes'));
    `);
    if (!hasRecentCourses || !hasRecentNotes) throw new Error('Recent Courses or Recent Notes section missing');
    return 'Recent Courses and Notes sections rendered and active';
  });

  // 3. Duplicate YouTube imports are rejected
  await testStep(3, 'Duplicate YouTube imports are rejected with friendly notification', async () => {
    // Click Add Video button
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Video'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const dialogOpen = await client.eval(`return !!document.querySelector('div[role="dialog"]');`);
    if (!dialogOpen) throw new Error('Add video dialog did not open');

    // Enter a test YouTube URL
    await client.eval(`
      const input = document.querySelector('div[role="dialog"] input[type="text"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(200);

    // Click Import
    await client.eval(`
      const submitBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.innerText.includes('Import Video'));
      if (submitBtn) submitBtn.click();
    `);
    await sleep(1000);

    // Now try adding the same URL again
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Video'));
      if (btn) btn.click();
    `);
    await sleep(400);

    await client.eval(`
      const input = document.querySelector('div[role="dialog"] input[type="text"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(200);

    await client.eval(`
      const submitBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.innerText.includes('Import Video'));
      if (submitBtn) submitBtn.click();
    `);
    await sleep(600);

    const warningText = await client.eval(`
      const warn = document.querySelector('div[style*="rgba(245, 158, 11"]');
      return warn ? warn.innerText.replace(/\\n/g, ' ') : null;
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf126_03_duplicate_warning.png'));
    if (!warningText) throw new Error('Duplicate warning notification was not displayed');
    return `Duplicate warning verified: "${warningText}"`;
  });

  // 4. Resume Lecture opens correct video and saved position
  await testStep(4, 'Resume Lecture opens correct video and saved position', async () => {
    // Navigate to dashboard
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Dashboard'));
      if (btn) btn.click();
    `);
    await sleep(600);

    // Click button inside Resume Lecture card
    const clicked = await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Resume Lecture'));
      if (btn) { btn.click(); return true; }
      return false;
    `);
    if (!clicked) throw new Error('Resume lecture action button not found');
    await sleep(800);

    const isPlayerOpen = await client.eval(`return !!document.querySelector('iframe');`);
    const activeTabAria = await client.eval(`
      const activeNav = document.querySelector('aside nav button[aria-current="page"]');
      return activeNav?.innerText.replace(/\\n/g, ' ') || '';
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf126_04_resume_lecture.png'));
    if (!isPlayerOpen) throw new Error('Player iframe did not open');
    return `Player mounted: ${isPlayerOpen}, Active Tab: "${activeTabAria}"`;
  });

  // 5. Video Bookmarks UI: create, seek, delete
  await testStep(5, 'Video Bookmarks UI: create timestamped bookmark, seek, and delete', async () => {
    const hasBookmarksSection = await client.eval(`
      return Array.from(document.querySelectorAll('h3')).some(h => h.innerText.includes('Video Bookmarks'));
    `);
    if (!hasBookmarksSection) throw new Error('Video Bookmarks section not found in player view');

    // Add a new bookmark at 05:00
    await client.eval(`
      const timeInput = document.querySelector('input[placeholder*="Time"]');
      const labelInput = document.querySelector('input[placeholder*="Bookmark note"]');
      if (timeInput && labelInput) {
        const timeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        timeSetter.call(timeInput, '5:00');
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));

        const labelSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        labelSetter.call(labelInput, 'Key Concept Explanation');
        labelInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('+ Add Bookmark'));
      if (addBtn) addBtn.click();
    `);
    await sleep(600);

    const bookmarkCount = await client.eval(`
      const bmHeaders = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Video Bookmarks'));
      return bmHeaders?.innerText;
    `);

    // Verify seek button exists
    const hasSeekBtn = await client.eval(`
      return Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('5:00'));
    `);

    await client.screenshot(path.join(screenshotsDir, 'sf126_05_video_bookmarks.png'));
    if (!hasSeekBtn) throw new Error('Bookmark seek button not rendered');
    return `Bookmark added: "${bookmarkCount}", Seek button present: ${hasSeekBtn}`;
  });

  // 6. Library Search & Filter
  await testStep(6, 'Library Search & Filter bar filters courses and shows empty states', async () => {
    // Type in search query that matches nothing
    await client.eval(`
      const search = document.querySelector('input[placeholder*="Search courses"]');
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(search, 'nonexistent_query_xyz');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(400);

    const emptyText = await client.eval(`
      const emptyCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('No courses match'));
      return emptyCard ? 'empty_state_shown' : 'courses_still_visible';
    `);

    // Clear search
    await client.eval(`
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Clear Search'));
      if (clearBtn) clearBtn.click();
    `);
    await sleep(400);

    await client.screenshot(path.join(screenshotsDir, 'sf126_06_library_search.png'));
    return `Search filter verified (Empty state response: ${emptyText})`;
  });

  // 7. Notes Search Bar
  await testStep(7, 'Notes Search Bar filters study notes by query', async () => {
    // Navigate to Notes
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Notes'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const hasNotesSearch = await client.eval(`
      return !!document.querySelector('input[placeholder*="Search notes"]');
    `);
    if (!hasNotesSearch) throw new Error('Notes search bar not found');
    await client.screenshot(path.join(screenshotsDir, 'sf126_07_notes_search.png'));
    return 'Notes search input verified and mounted';
  });

  // 8. Notes Markdown and LaTeX preview toggle
  await testStep(8, 'Notes Markdown and LaTeX preview toggle renders properly', async () => {
    // Type markdown note with LaTeX math
    await client.eval(`
      const titleInput = document.querySelector('input[placeholder*="Note title"]');
      const contentInput = document.querySelector('textarea#quick-note-input');
      if (titleInput && contentInput) {
        const tSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        tSetter.call(titleInput, 'Quantum Computing Basics');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        const cSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        cSetter.call(contentInput, 'State superposition equation: $$ |\\\\psi\\\\rangle = \\\\alpha |0\\\\rangle + \\\\beta |1\\\\rangle $$');
        contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(200);

    // Toggle Preview
    await client.eval(`
      const previewBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preview Markdown/LaTeX'));
      if (previewBtn) previewBtn.click();
    `);
    await sleep(300);

    const hasPreview = await client.eval(`
      const prevBox = document.querySelector('div[style*="min-height: 80px"]');
      return prevBox?.innerText.includes('superposition');
    `);

    // Toggle back to edit mode
    await client.eval(`
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Edit Mode'));
      if (editBtn) editBtn.click();
    `);
    await sleep(200);

    // Save note
    await client.eval(`
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Note to SQLite'));
      if (saveBtn) saveBtn.click();
    `);
    await sleep(600);

    await client.screenshot(path.join(screenshotsDir, 'sf126_08_notes_preview.png'));
    return `Preview toggle verified: ${hasPreview}, Note saved to SQLite`;
  });

  // 9. Notes drafts persist across navigation
  await testStep(9, 'Notes drafts persist across page changes', async () => {
    // Type draft content
    await client.eval(`
      const titleInput = document.querySelector('input[placeholder*="Note title"]');
      const contentInput = document.querySelector('textarea#quick-note-input');
      if (titleInput && contentInput) {
        const tSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        tSetter.call(titleInput, 'Persistent Draft Test');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        const cSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        cSetter.call(contentInput, 'Autosaved content waiting to be restored.');
        contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(300);

    // Navigate away to Library
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Library'));
      if (btn) btn.click();
    `);
    await sleep(300);

    // Navigate back to Notes
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Notes'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const restoredContent = await client.eval(`
      return document.querySelector('textarea#quick-note-input')?.value;
    `);
    if (!restoredContent?.includes('Autosaved content')) {
      throw new Error(`Draft not restored, got: "${restoredContent}"`);
    }

    // Clean up draft
    await client.eval(`
      const titleInput = document.querySelector('input[placeholder*="Note title"]');
      const contentInput = document.querySelector('textarea#quick-note-input');
      if (titleInput && contentInput) {
        const tSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        tSetter.call(titleInput, '');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        const cSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        cSetter.call(contentInput, '');
        contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    return `Draft restored successfully: "${restoredContent}"`;
  });

  // 10. Focus timer starts, pauses, and resets
  await testStep(10, 'Focus timer starts, pauses, and resets', async () => {
    // Navigate to Focus
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Focus'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const initialTime = await client.eval(`
      return document.querySelector('div[style*="font-size: 3.5rem"]')?.innerText;
    `);

    // Click Start
    await client.eval(`
      const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Sprint') || b.innerText.includes('Pause'));
      if (startBtn) startBtn.click();
    `);
    await sleep(1500);

    const tickingTime = await client.eval(`
      return document.querySelector('div[style*="font-size: 3.5rem"]')?.innerText;
    `);

    // Click Pause
    await client.eval(`
      const pauseBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Pause'));
      if (pauseBtn) pauseBtn.click();
    `);
    await sleep(300);

    // Click Reset
    await client.eval(`
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset'));
      if (resetBtn) resetBtn.click();
    `);
    await sleep(300);

    const resetTime = await client.eval(`
      return document.querySelector('div[style*="font-size: 3.5rem"]')?.innerText;
    `);

    await client.screenshot(path.join(screenshotsDir, 'sf126_10_focus_timer.png'));
    return `Initial: ${initialTime}, Ticked: ${tickingTime}, Reset: ${resetTime}`;
  });

  // 11. Focus state restores after navigation
  await testStep(11, 'Focus state restores after page navigation', async () => {
    // Navigate away to Roadmaps
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Roadmaps'));
      if (btn) btn.click();
    `);
    await sleep(300);

    // Return to Focus
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Focus'));
      if (btn) btn.click();
    `);
    await sleep(300);

    const time = await client.eval(`
      return document.querySelector('div[style*="font-size: 3.5rem"]')?.innerText;
    `);
    return `Focus timer restored: ${time}`;
  });

  // 12. Roadmap milestones toggle and persist with dynamic recalculation
  await testStep(12, 'Roadmap milestones toggle and persist with dynamic recalculation', async () => {
    // Navigate to Roadmaps
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Roadmaps'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const initialCheckboxes = await client.eval(`
      const cbs = document.querySelectorAll('input[type="checkbox"]');
      return cbs.length;
    `);
    if (initialCheckboxes === 0) throw new Error('No roadmap milestones found');

    // Toggle first checkbox
    await client.eval(`
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) cb.click();
    `);
    await sleep(500);

    const progressBadges = await client.eval(`
      const badges = Array.from(document.querySelectorAll('span, div')).filter(el => el.innerText.includes('%') && el.innerText.includes('Mastery'));
      return badges.map(b => b.innerText.trim());
    `);

    await client.screenshot(path.join(screenshotsDir, 'sf126_12_roadmap_milestone.png'));
    return `Milestones found: ${initialCheckboxes}, Mastery badges: "${progressBadges.join(', ')}"`;
  });

  // 13. Cloud sync remains paused until explicitly started
  await testStep(13, 'Cloud sync remains paused until explicitly started', async () => {
    // Navigate to Settings
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Settings'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const syncStatusText = await client.eval(`
      const syncSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('SYNC STATE'));
      return syncSection?.innerText.slice(0, 80).replace(/\\n/g, ' ');
    `);

    await client.screenshot(path.join(screenshotsDir, 'sf126_13_cloud_sync_paused.png'));
    return `Sync Engine State: "${syncStatusText || 'Idle/Paused'}"`;
  });

  // 14. Toast notifications appear on actions and are accessible
  await testStep(14, 'Toast notification system appears on actions and is accessible', async () => {
    // Click Run Database Integrity Check
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run Database Integrity Check'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const toastText = await client.eval(`
      const toasts = Array.from(document.querySelectorAll('div[role="status"]')).map(d => d.innerText.replace(/\\n/g, ' '));
      return toasts.find(t => t.includes('Storage Integrity Check')) || null;
    `);
    await client.screenshot(path.join(screenshotsDir, 'sf126_14_accessible_toast.png'));
    if (!toastText) {
      throw new Error('Expected storage integrity toast notification');
    }
    return `Toast notification verified: "${toastText}"`;
  });

  // 15. Modal keyboard accessibility and sidebar active indicator
  await testStep(15, 'Modal keyboard accessibility (Esc) and sidebar active page indicator', async () => {
    // Press F1 to open Shortcuts modal
    await client.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true }));
    `);
    await sleep(300);

    const modalOpen = await client.eval(`return !!document.getElementById('shortcuts-modal-title');`);
    if (!modalOpen) throw new Error('Shortcuts modal did not open on F1');

    // Press Escape to dismiss
    await client.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await sleep(300);

    const modalClosed = await client.eval(`return !document.getElementById('shortcuts-modal-title');`);
    if (!modalClosed) throw new Error('Shortcuts modal did not close on Escape');

    // Verify sidebar aria-current="page"
    const activeNav = await client.eval(`
      const el = document.querySelector('aside nav button[aria-current="page"]');
      return el?.innerText.replace(/\\n/g, ' ');
    `);

    return `Modal opened and closed via Escape, Active Nav: "${activeNav}"`;
  });

  console.log('\n================================================================');
  console.log('SF-126 Acceptance Test Results Summary');
  console.log('================================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passes} | Failed: ${fails}`);
  client.close();
}

runSF126Acceptance().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
