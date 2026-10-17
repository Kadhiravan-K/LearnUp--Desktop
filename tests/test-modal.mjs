import { CDPClient, getWebViewTarget } from './cdp-client.mjs';

async function main() {
  const target = await getWebViewTarget();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  console.log('1. Checking Add Video button...');
  const hasBtn = await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Video / Playlist'));
    return !!btn;
  `);
  console.log('Has button:', hasBtn);

  console.log('2. Clicking Add Video button...');
  await client.eval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Video / Playlist'));
    if (btn) btn.click();
  `);
  await new Promise((r) => setTimeout(r, 400));

  const hasDialog = await client.eval(`
    return !!document.querySelector('div[role="dialog"]');
  `);
  console.log('Has dialog open:', hasDialog);

  console.log('3. Filling input...');
  await client.eval(`
    const input = document.querySelector('div[role="dialog"] input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise((r) => setTimeout(r, 200));

  const inputValue = await client.eval(`
    return document.querySelector('div[role="dialog"] input')?.value;
  `);
  console.log('Input value:', inputValue);

  console.log('4. Clicking Import Video button...');
  await client.eval(`
    const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.innerText.includes('Import Video'));
    if (btn) btn.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));

  const activeTabTitle = await client.eval(`
    return document.querySelector('main h1')?.innerText;
  `);
  console.log('Active tab title:', activeTabTitle);

  const iframeSrc = await client.eval(`
    return document.querySelector('iframe')?.src;
  `);
  console.log('Iframe src:', iframeSrc);

  const learningItemsCount = await client.eval(`
    return document.querySelectorAll('button[style*="background: rgb(239, 68, 68)"]').length;
  `);
  console.log('Learning items count (trash icons):', learningItemsCount);

  client.close();
}

main().catch(console.error);
