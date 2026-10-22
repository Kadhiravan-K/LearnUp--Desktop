import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parsePlaylistXmlFeed, YouTubeClient } from '@/lib/youtube/client';
import { DesktopImportService } from '@/lib/services/import-service';
import { setPlatform } from '@/adapters/platform';
import type { IPlatformAdapter } from '@/adapters/IPlatformAdapter';
import type { LearningItem } from '@/core';

const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>TypeScript Deep Dive Playlist</title>
  <entry>
    <id>yt:video:vid_001</id>
    <yt:videoId>vid_001</yt:videoId>
    <title>Episode 1: Introductions &amp; Setup</title>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/vid_001/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:vid_002</id>
    <yt:videoId>vid_002</yt:videoId>
    <title>Episode 2: Advanced Generics &lt;T&gt;</title>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/vid_002/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
</feed>`;

describe('YouTube XML Feed Parser (parsePlaylistXmlFeed)', () => {
  it('parses valid YouTube Atom RSS feed into structured metadata and items', () => {
    const result = parsePlaylistXmlFeed(SAMPLE_ATOM_XML, 'PL_test123');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('PL_test123');
    expect(result!.title).toBe('TypeScript Deep Dive Playlist');
    expect(result!.thumbnailUrl).toBe('https://i.ytimg.com/vi/vid_001/hqdefault.jpg');
    expect(result!.items).toHaveLength(2);

    expect(result!.items[0].videoId).toBe('vid_001');
    expect(result!.items[0].title).toBe('Episode 1: Introductions & Setup');
    expect(result!.items[0].sourcePosition).toBe(0);

    expect(result!.items[1].videoId).toBe('vid_002');
    expect(result!.items[1].title).toBe('Episode 2: Advanced Generics <T>');
    expect(result!.items[1].sourcePosition).toBe(1);
  });

  it('gracefully returns null for empty or non-feed text', () => {
    expect(parsePlaylistXmlFeed('', 'PL_empty')).toBeNull();
    expect(parsePlaylistXmlFeed('<html><body>Not an Atom Feed</body></html>', 'PL_bad')).toBeNull();
  });
});

describe('DesktopImportService Ingestion Workflow', () => {
  let mockSavedItems: LearningItem[] = [];

  const mockStorage: any = {
    listLearningItems: vi.fn(async () => mockSavedItems),
    saveLearningItem: vi.fn(async (item: LearningItem) => {
      mockSavedItems.push(item);
      return item;
    }),
    appendMutation: vi.fn(async (mut: any) => mut)
  };

  const mockPlatform: Partial<IPlatformAdapter> = {
    isDesktop: () => true,
    storage: mockStorage,
    fetchYouTubeMetadata: vi.fn(async (url: string) => {
      if (url.includes('PL_test123')) {
        return { title: 'TypeScript Deep Dive', thumbnailUrl: 'https://img.test/pl.jpg' };
      }
      return { title: 'Sample Single Video', thumbnailUrl: 'https://img.test/vid.jpg' };
    }),
    fetchRemoteText: vi.fn(async (url: string) => {
      if (url.includes('playlist_id=PL_test123')) {
        return SAMPLE_ATOM_XML;
      }
      return '';
    })
  };

  beforeEach(() => {
    mockSavedItems = [];
    setPlatform(mockPlatform as IPlatformAdapter);
  });

  it('previews a single video URL accurately', async () => {
    const service = new DesktopImportService();
    const preview = await service.previewUrl('https://www.youtube.com/watch?v=12345678901');

    expect(preview.type).toBe('video');
    expect(preview.id).toBe('12345678901');
    expect(preview.title).toBe('Sample Single Video');
    expect(preview.totalVideos).toBe(1);
    expect(preview.videos).toHaveLength(1);
    expect(preview.videos[0].videoId).toBe('12345678901');
  });

  it('previews a playlist URL with parsed feed lessons', async () => {
    const service = new DesktopImportService();
    const preview = await service.previewUrl('https://www.youtube.com/playlist?list=PL_test123');

    expect(preview.type).toBe('playlist');
    expect(preview.id).toBe('PL_test123');
    expect(preview.title).toBe('TypeScript Deep Dive');
    expect(preview.totalVideos).toBe(2);
    expect(preview.videos).toHaveLength(2);
    expect(preview.videos[0].videoId).toBe('vid_001');
    expect(preview.videos[1].videoId).toBe('vid_002');
  });

  it('imports a course and writes LearningItem and mutation journal locally', async () => {
    const service = new DesktopImportService();
    const { item } = await service.importCourse(
      'user_local_1',
      null,
      {
        url: 'https://www.youtube.com/playlist?list=PL_test123',
        title: 'Custom Title Override',
        skillDomain: 'Programming',
        tags: ['TypeScript', 'Frontend']
      }
    );

    expect(item).toBeDefined();
    expect(item.title).toBe('Custom Title Override');
    expect(item.skillDomain).toBe('Programming');
    expect(item.tags).toEqual(['TypeScript', 'Frontend']);
    expect(item.itemCount).toBe(2);
    expect(item.videosJson).toBeDefined();

    const parsedVideos = JSON.parse(item.videosJson!);
    expect(parsedVideos).toHaveLength(2);
    expect(parsedVideos[0].title).toBe('Episode 1: Introductions & Setup');

    // Verify storage persistence was called
    expect(mockStorage.saveLearningItem).toHaveBeenCalledTimes(1);
    expect(mockStorage.appendMutation).toHaveBeenCalledTimes(1);
  });
});
