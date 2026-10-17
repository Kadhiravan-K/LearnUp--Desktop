import { IPlatformAdapter, PlatformCapabilities } from './IPlatformAdapter';
import { TauriStorageAdapter } from './TauriStorageAdapter';
import { WebFallbackAdapter } from './WebFallbackAdapter';
import { IStorageAdapter } from '../types/contracts';

class TauriPlatformAdapter implements IPlatformAdapter {
  public readonly capabilities: PlatformCapabilities = {
    isNativeDesktop: true,
    isOfflineCapable: true,
    hasHardwareAcceleration: true,
    supportsSystemTray: true,
    platformName: 'windows',
  };

  public readonly storage: IStorageAdapter;

  constructor() {
    this.storage = new TauriStorageAdapter();
  }

  public async init(): Promise<void> {
    await this.storage.init();
  }

  public async isOnline(): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('check_online_status');
    } catch {
      return navigator.onLine;
    }
  }

  public async openExternalUrl(url: string): Promise<void> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Disallowed URL protocol: ${parsed.protocol}. Only http and https are permitted.`);
      }
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch (err) {
      console.error('Refused to open invalid or unsafe external URL:', url, err);
      throw err;
    }
  }

  public async fetchYouTubeMetadata(url: string): Promise<{ title: string; author: string; thumbnailUrl: string }> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<{ title: string; author: string; thumbnailUrl: string }>('fetch_youtube_metadata', { url });
  }

  public async showNotification(title: string, body: string): Promise<void> {
    console.log(`[Notification] ${title}: ${body}`);
  }
}

class WebBrowserPlatformAdapter implements IPlatformAdapter {
  public readonly capabilities: PlatformCapabilities = {
    isNativeDesktop: false,
    isOfflineCapable: true,
    hasHardwareAcceleration: false,
    supportsSystemTray: false,
    platformName: 'web',
  };

  public readonly storage: IStorageAdapter;

  constructor() {
    this.storage = new WebFallbackAdapter();
  }

  public async init(): Promise<void> {
    await this.storage.init();
  }

  public async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  public async openExternalUrl(url: string): Promise<void> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Disallowed URL protocol: ${parsed.protocol}. Only http and https are permitted.`);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Refused to open invalid or unsafe external URL:', url, err);
      throw err;
    }
  }

  public async fetchYouTubeMetadata(url: string): Promise<{ title: string; author: string; thumbnailUrl: string }> {
    // In web fallback, extract video id and construct oEmbed or standard preview
    const videoIdMatch = url.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'sample';
    return {
      title: `YouTube Video (${videoId})`,
      author: 'YouTube Creator',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  public async showNotification(title: string, body: string): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      console.log(`[Notification] ${title}: ${body}`);
    }
  }
}

let platformInstance: IPlatformAdapter | null = null;

export function getPlatform(): IPlatformAdapter {
  if (!platformInstance) {
    const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    platformInstance = isTauri ? new TauriPlatformAdapter() : new WebBrowserPlatformAdapter();
  }
  return platformInstance;
}
