import { CDPClient, getWebViewTarget } from './cdp-client.mjs';

async function main() {
  const target = await getWebViewTarget();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  console.log('Testing platform.fetchYouTubeMetadata...');
  const res = await client.eval(`
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const r = await invoke('fetch_youtube_metadata', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      return JSON.stringify({ ok: true, data: r });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('Result:', res);

  // Check dialog form input
  const isModalOpen = await client.eval(`return !!document.querySelector('div[role="dialog"]');`);
  console.log('Is modal open:', isModalOpen);

  client.close();
}

main().catch(console.error);
