import { spawn } from 'child_process';
import fs from 'fs';
import { CDPClient, getWebViewTarget } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const exePath = 'src-tauri/target/release/learnup-desktop.exe';
  console.log(`[Runner] Spawning ${exePath} with CDP port 9222...`);
  const appProcess = spawn(
    exePath,
    [],
    {
      env: {
        ...process.env,
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9222',
        RUST_BACKTRACE: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  appProcess.stdout.on('data', (d) => console.log('[STDOUT]', d.toString()));
  appProcess.stderr.on('data', (d) => console.error('[STDERR]', d.toString()));
  appProcess.on('exit', (code) => console.log('[APP EXITED]', code));

  console.log('[Runner] Waiting for WebView2 on port 9222...');
  let target = null;
  for (let i = 0; i < 20; i++) {
    try {
      target = await getWebViewTarget(1);
      if (target) break;
    } catch {
      await sleep(1000);
    }
  }

  if (!target) {
    console.error('Failed to connect to WebView2 on port 9222 within 20s');
    appProcess.kill();
    return;
  }

  console.log(`[Runner] Connected to target: ${target.title} (${target.url})`);
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await sleep(1500);

  console.log('\n--- 1. Testing Tauri IPC invoke directly in WebView2 ---');
  const tauriTest = await client.eval(`
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return JSON.stringify({ ok: false, error: 'invoke not found on window.__TAURI__' });
      const online = await invoke('check_online_status');
      const profiles = await invoke('db_list_profiles');
      return JSON.stringify({ ok: true, online, profilesCount: profiles.length });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('Tauri IPC Test:', tauriTest);

  console.log('\n--- 2. Testing fetch_youtube_metadata via Tauri IPC ---');
  const metaTest = await client.eval(`
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      const r = await invoke('fetch_youtube_metadata', { url: 'https://www.youtube.com/watch?v=M576WGiDBdQ' });
      return JSON.stringify({ ok: true, data: r });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('YouTube Metadata Test:', metaTest);

  console.log('\n--- 3. Testing db_save_learning_item with array of tags ---');
  const saveItemTest = await client.eval(`
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      const itemWithArrayTags = {
        id: 'test_item_1',
        userId: 'guest_local_default',
        title: 'Test Video',
        sourceType: 'video',
        sourceId: 'M576WGiDBdQ',
        thumbnailUrl: 'https://i.ytimg.com/vi/M576WGiDBdQ/hqdefault.jpg',
        channelTitle: 'freeCodeCamp.org',
        itemCount: 1,
        description: 'Test description',
        skillDomain: 'Programming',
        tags: ['solidity', 'blockchain'],
        videosJson: JSON.stringify([{ videoId: 'M576WGiDBdQ', title: 'Test Video' }]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const res = await invoke('db_save_learning_item', { item: itemWithArrayTags });
      return JSON.stringify({ ok: true, res });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('Save Learning Item with Array Tags Test:', saveItemTest);

  console.log('\n--- 4. Testing db_save_learning_item with string tags ---');
  const saveItemStringTagsTest = await client.eval(`
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      const itemWithStringTags = {
        id: 'test_item_2',
        userId: 'guest_local_default',
        title: 'Test Video 2',
        sourceType: 'video',
        sourceId: 'M576WGiDBdQ',
        thumbnailUrl: 'https://i.ytimg.com/vi/M576WGiDBdQ/hqdefault.jpg',
        channelTitle: 'freeCodeCamp.org',
        itemCount: 1,
        description: 'Test description',
        skillDomain: 'Programming',
        tags: 'solidity,blockchain',
        videosJson: JSON.stringify([{ videoId: 'M576WGiDBdQ', title: 'Test Video 2' }]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const res = await invoke('db_save_learning_item', { item: itemWithStringTags });
      return JSON.stringify({ ok: true, res });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('Save Learning Item with String Tags Test:', saveItemStringTagsTest);

  console.log('\n--- 5. Testing db_list_learning_items and clean up ---');
  const listItemsTest = await client.eval(`
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
      const items = await invoke('db_list_learning_items', { userId: 'guest_local_default' });
      // clean up test items
      await invoke('db_delete_learning_item', { userId: 'guest_local_default', itemId: 'test_item_1' });
      await invoke('db_delete_learning_item', { userId: 'guest_local_default', itemId: 'test_item_2' });
      return JSON.stringify({ ok: true, count: items.length, sampleTags: items[0]?.tags });
    } catch (e) {
      return JSON.stringify({ ok: false, error: e.toString() });
    }
  `);
  console.log('List Learning Items Test:', listItemsTest);

  console.log('\n--- 6. Checking Console Errors Captured by CDP ---');
  for (const log of client.consoleLogs) {
    console.log(`[${log.type.toUpperCase()}] ${log.text}`);
  }
  for (const err of client.errors) {
    console.error('[CDP EXCEPTION]', err);
  }

  client.close();
  appProcess.kill();
  console.log('[Runner] Completed and closed.');
}

main().catch(console.error);
