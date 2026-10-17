import { IStorageAdapter } from '../types/contracts';

export interface PlatformCapabilities {
  isNativeDesktop: boolean;
  isOfflineCapable: boolean;
  hasHardwareAcceleration: boolean;
  supportsSystemTray: boolean;
  platformName: 'windows' | 'web' | 'macos' | 'linux';
}

export interface IPlatformAdapter {
  readonly capabilities: PlatformCapabilities;
  readonly storage: IStorageAdapter;

  init(): Promise<void>;
  isOnline(): Promise<boolean>;
  openExternalUrl(url: string): Promise<void>;
  fetchYouTubeMetadata(url: string): Promise<{ title: string; author: string; thumbnailUrl: string }>;
  showNotification(title: string, body: string): Promise<void>;
}
