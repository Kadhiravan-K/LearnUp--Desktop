import { CDPClient, getWebViewTarget } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Connecting to WebView2 on port 9222...');
  const target = await getWebViewTarget(10);
  console.log(`Connected to target: ${target.title} (${target.url})`);

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  console.log('\n--- 1. Checking Active Console Errors & Logs ---');
  for (const log of client.consoleLogs) {
    console.log(`[CONSOLE ${log.type.toUpperCase()}] ${log.text}`);
  }

  console.log('\n--- 2. Checking Active Profile & Storage State ---');
  const appState = await client.eval(`
    JSON.stringify({
      pathname: window.location.pathname,
      title: document.title,
      isTauri: Boolean(window.__TAURI_INTERNALS__),
      localStorageKeys: Object.keys(localStorage)
    })
  `);
  console.log('AppState:', appState);

  console.log('\n--- 3. Testing Single Video Preview & Import ---');
  // Open Add Course Modal
  await client.eval(`
    // Find Add Course button
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Course') || b.innerText.includes('Add Video'));
    if (btn) btn.click();
  `);
  await sleep(1000);

  // Check if modal opened
  const modalOpen = await client.eval(`Boolean(document.querySelector('[role="dialog"]'))`);
  console.log('AddCourseModal open:', modalOpen);

  if (modalOpen) {
    // Select Single Video card
    await client.eval(`
      const videoCard = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText.includes('Single Video') && el.innerText.includes('Standalone'));
      if (videoCard) videoCard.click();
    `);
    await sleep(500);

    // Enter real YouTube URL
    const singleUrl = "https://www.youtube.com/watch?v=M576WGiDBdQ";
    await client.eval(`
      const input = document.querySelector('input[type="text"], textarea');
      if (input) {
        input.value = ${JSON.stringify(singleUrl)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await sleep(500);

    // Click Fetch Preview button
    console.log('Clicking Fetch Preview...');
    await client.eval(`
      const fetchBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fetch Preview') || b.innerText.includes('Next'));
      if (fetchBtn) fetchBtn.click();
    `);

    // Wait for preview or error
    let attempts = 0;
    while (attempts < 10) {
      await sleep(1000);
      attempts++;
      const currentModalState = await client.eval(`
        JSON.stringify({
          errorText: document.querySelector('.errorText, [class*="error"]')?.innerText || null,
          modalText: document.querySelector('[role="dialog"]')?.innerText.substring(0, 300),
          step: document.querySelector('[class*="stepActive"], [class*="active"]')?.innerText
        })
      `);
      console.log(`[Attempt ${attempts}] Modal State:`, currentModalState);
      const parsed = JSON.parse(currentModalState);
      if (parsed.errorText) {
        console.error('ERROR ENCOUNTERED IN MODAL:', parsed.errorText);
        break;
      }
      if (parsed.modalText && parsed.modalText.includes('Curriculum Syllabus')) {
        console.log('SUCCESS: Preview Loaded!');
        break;
      }
    }
  }

  console.log('\n--- Recent Console Logs ---');
  for (const log of client.consoleLogs) {
    console.log(`[CONSOLE ${log.type.toUpperCase()}] ${log.text}`);
  }

  client.close();
}

main().catch(console.error);
