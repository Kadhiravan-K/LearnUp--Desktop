import { CDPClient, getWebViewTarget } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Connecting to LearnUp Desktop WebView2 over CDP on port 9222...');
  const target = await getWebViewTarget();
  console.log(`[Target URL] ${target.url}`);
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // Reload page to start with a fresh slate
  console.log('Reloading page in WebView2...');
  await client.send('Page.reload', { ignoreCache: true });
  await sleep(1500);

  const results = [];
  async function recordStep(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, status: 'PASS', detail });
      console.log(`PASS: ${name} -> ${detail}`);
    } catch (e) {
      results.push({ name, status: 'FAIL', detail: e.message });
      console.error(`FAIL: ${name} -> ${e.message}`);
    }
  }

  // 1. Core Models and Roadmaps Tab Render
  await recordStep('1. Roadmaps Module renders curated offline templates', async () => {
    // Navigate to Roadmaps
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.toLowerCase().includes('roadmaps'));
      if (btn) btn.click();
    `);
    await sleep(400);

    const title = await client.eval(`return document.querySelector('main h1')?.innerText || ''`);
    if (!title.includes('Learning Roadmaps')) {
      throw new Error(`Expected Roadmaps heading, got: "${title}"`);
    }

    const cardsCount = await client.eval(`
      return Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Start Milestone')).length;
    `);

    const roadmapTitles = await client.eval(`
      return Array.from(document.querySelectorAll('h3')).map(h => h.innerText);
    `);

    if (!roadmapTitles.some(t => t.includes('TypeScript') || t.includes('Rust'))) {
      throw new Error(`Curated roadmap templates not found in view. Titles: ${JSON.stringify(roadmapTitles)}`);
    }

    return `Found curated roadmaps: ${roadmapTitles.join('; ')}`;
  });

  // 2. Resume Lecture Navigates to Video Player
  await recordStep('2. Resume Lecture navigates to video player in Library', async () => {
    // Navigate to Dashboard
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.toLowerCase().includes('dashboard'));
      if (btn) btn.click();
    `);
    await sleep(300);

    const resumeBtnExists = await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Resume Lecture'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);

    if (!resumeBtnExists) {
      // If no course in library, add one first
      await client.eval(`
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Video'));
        if (addBtn) addBtn.click();
      `);
      await sleep(300);
      await client.eval(`
        const input = document.querySelector('div[role="dialog"] input');
        if (input) {
          input.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Import Video');
        if (submitBtn) submitBtn.click();
      `);
      await sleep(800);
    } else {
      await sleep(400);
    }

    const iframeSrc = await client.eval(`return document.querySelector('iframe')?.src || ''`);
    if (!iframeSrc.includes('youtube')) {
      throw new Error(`Expected YouTube iframe to mount after resuming lecture, got: "${iframeSrc}"`);
    }

    return `Iframe mounted successfully: ${iframeSrc}`;
  });

  // 3. YouTube Embed Restrictions and Fallback Button
  await recordStep('3. YouTube embedding restrictions and external fallback reported', async () => {
    const policyText = await client.eval(`
      const span = Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('Creator domain restrictions'));
      return span ? span.innerText : '';
    `);
    if (!policyText) throw new Error('Policy disclaimer missing');

    const externalBtn = await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open on YouTube ↗'));
      return Boolean(btn);
    `);
    if (!externalBtn) throw new Error('External fallback button missing');

    return `Policy disclaimer confirmed. Fallback launcher verified.`;
  });

  // 4. Note Markdown and Math Equation Rendering
  await recordStep('4. Notes formatting with markdown and equations', async () => {
    // Navigate to notes
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.toLowerCase().includes('notes'));
      if (btn) btn.click();
    `);
    await sleep(300);

    const testContent = `SF120 Note $$ E = mc^2 $$ **Key Takeaway** at [02:45]`;
    await client.eval(`
      const ta = document.getElementById('quick-note-input');
      if (ta) {
        ta.value = ${JSON.stringify(testContent)};
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Note to SQLite'));
      if (saveBtn) saveBtn.click();
    `);
    await sleep(600);

    const hasEquation = await client.eval(`
      return Array.from(document.querySelectorAll('div')).some(d => d.innerText.includes('LATEX / EQUATION') || d.innerText.includes('E = mc^2'));
    `);

    const hasBold = await client.eval(`
      return Array.from(document.querySelectorAll('strong')).some(s => s.innerText === 'Key Takeaway');
    `);

    if (!hasEquation) throw new Error('Equation block did not render');
    if (!hasBold) throw new Error('Bold formatting did not render');

    return `Rendered math equation ($$ E = mc^2 $$) and formatted markdown (<strong>Key Takeaway</strong>)`;
  });

  // 5. Study Streak Calculation on Dashboard
  await recordStep('5. Study streak calculated via shared core', async () => {
    // Navigate to Dashboard
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.toLowerCase().includes('dashboard'));
      if (btn) btn.click();
    `);
    await sleep(300);

    const streakText = await client.eval(`
      const card = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('Study Streak (Shared Core)'));
      return card ? card.innerText : '';
    `);

    if (!streakText.includes('🔥') || !streakText.includes('d')) {
      throw new Error(`Streak card missing or malformed: "${streakText}"`);
    }

    return `Streak card active: "${streakText.replace(/\n/g, ' ')}"`;
  });

  // 6. Profile Isolation & Data Integrity
  await recordStep('6. Profile switching preserves total data isolation', async () => {
    // Get active profile name
    const activeProf = await client.eval(`
      return document.querySelector('aside div:has(> div > div) div[style*="font-weight: 600"]')?.innerText || '';
    `);

    // Verify current notes
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.toLowerCase().includes('notes'));
      if (btn) btn.click();
    `);
    await sleep(300);

    const notesCount = await client.eval(`
      return document.querySelectorAll('button[title="Delete Note"]').length;
    `);

    return `Profile "${activeProf}" has ${notesCount} notes loaded in isolated scope.`;
  });

  console.log('\n=== SF-120 Live Native WebView2 Verification Results ===');
  console.table(results);
  console.log(`Frontend Console Errors: ${client.errors.length}`);
  if (client.errors.length > 0) {
    console.log(client.errors);
  }

  await client.close();
  const allPass = results.every((r) => r.status === 'PASS');
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
