import { AppError } from '../errors';
import { logger } from '../logging';
import {
  YouTubePlaylistItem,
  YouTubePlaylistMetadata,
  YouTubeVideoMetadata
} from '../types';
import { getPlatform } from '@/adapters/platform';

export interface IYouTubeClient {
  fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata>;
  fetchPlaylistMetadata(playlistId: string): Promise<YouTubePlaylistMetadata>;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parses a YouTube public Atom RSS XML feed into playlist metadata and video items.
 */
export function parsePlaylistXmlFeed(xml: string, playlistId: string): YouTubePlaylistMetadata | null {
  if (!xml || !xml.includes('<feed')) return null;

  const feedTitleMatch = xml.match(/<title>([^<]+)<\/title>/);
  const feedTitle = feedTitleMatch ? decodeXmlEntities(feedTitleMatch[1].trim()) : `Playlist ${playlistId}`;

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const items: YouTubePlaylistItem[] = [];
  let match: RegExpExecArray | null;
  let pos = 0;
  const seen = new Set<string>();

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryBlock = match[1];
    const videoIdMatch = entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entryBlock.match(/<title>([^<]+)<\/title>/);
    const thumbMatch = entryBlock.match(/<media:thumbnail[^>]+url="([^"]+)"/);

    if (videoIdMatch && videoIdMatch[1]) {
      const vId = videoIdMatch[1].trim();
      if (!seen.has(vId)) {
        seen.add(vId);
        items.push({
          videoId: vId,
          title: titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : `Lesson ${pos + 1}`,
          thumbnailUrl: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
          sourcePosition: pos,
          isAccessible: true
        });
        pos++;
      }
    }
  }

  if (items.length === 0) return null;

  return {
    id: playlistId,
    title: feedTitle,
    thumbnailUrl: items[0]?.thumbnailUrl || null,
    items
  };
}

export class YouTubeClient implements IYouTubeClient {
  /**
   * Fetches metadata for a single YouTube video using desktop platform adapter with browser fallback.
   */
  async fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    const platform = getPlatform();
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const meta = await platform.fetchYouTubeMetadata(watchUrl);
      if (meta && meta.title) {
        return {
          id: videoId,
          title: meta.title,
          thumbnailUrl: meta.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    } catch (err) {
      logger.warn('Platform fetchYouTubeMetadata failed, falling back to public oEmbed', {
        operation: 'fetchVideoMetadata',
        videoId,
        error: String(err)
      });
    }

    // Direct browser oEmbed fallback
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`);
      if (res.ok) {
        const json = await res.json();
        return {
          id: videoId,
          title: json.title || `Video (${videoId})`,
          thumbnailUrl: json.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    } catch {
      // ignore
    }

    return {
      id: videoId,
      title: `YouTube Video (${videoId})`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  /**
   * Fetches playlist metadata and child items via YouTube Data API v3 (if API key available)
   * or public Atom RSS feed with clear truncation reporting.
   */
  async fetchPlaylistMetadata(playlistId: string): Promise<YouTubePlaylistMetadata> {
    const platform = getPlatform();
    const apiKey = getYouTubeApiKey();

    // 1. If user provided a YouTube API key, paginate through the official YouTube Data API v3
    if (apiKey) {
      try {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&id=${playlistId}&key=${apiKey}`;
        let detailsRes = await fetch(detailsUrl);
        if (!detailsRes.ok) {
          const raw = await platform.fetchRemoteText(detailsUrl);
          detailsRes = { ok: true, json: async () => JSON.parse(raw) } as any;
        }

        if (detailsRes.ok) {
          const detailsJson = await detailsRes.json();
          const playlist = detailsJson.items?.[0];
          if (playlist) {
            if (playlist.status?.privacyStatus === 'private') {
              throw new AppError('YOUTUBE_ERROR', `YouTube playlist "${playlistId}" is private and cannot be imported.`, 422);
            }

            const title = playlist.snippet?.title || `Playlist (${playlistId})`;
            const thumb = playlist.snippet?.thumbnails?.high?.url ||
              playlist.snippet?.thumbnails?.medium?.url ||
              playlist.snippet?.thumbnails?.default?.url ||
              null;

            // Paginate through /playlistItems
            const allItems: YouTubePlaylistItem[] = [];
            let pageToken: string | null = null;
            const seenIds = new Set<string>();
            let safetyPages = 0;

            do {
              safetyPages++;
              if (safetyPages > 100) break;

              const itemsUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&playlistId=${playlistId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
              let rawJson: any = null;
              try {
                const res = await fetch(itemsUrl);
                if (res.ok) {
                  rawJson = await res.json();
                }
              } catch {
                // fallback to native desktop curl
              }

              if (!rawJson) {
                const rawText = await platform.fetchRemoteText(itemsUrl);
                try {
                  rawJson = JSON.parse(rawText);
                } catch {
                  break;
                }
              }

              if (!rawJson) break;
              const rawItems: any[] = rawJson.items || [];

              for (const it of rawItems) {
                const vidId = it.snippet?.resourceId?.videoId;
                const itTitle = it.snippet?.title;
                const itStatus = it.status?.privacyStatus;

                if (!vidId || itTitle === 'Private video' || itTitle === 'Deleted video' || itStatus === 'private') {
                  continue;
                }

                if (seenIds.has(vidId)) continue;
                seenIds.add(vidId);

                const itemThumb = it.snippet?.thumbnails?.high?.url ||
                  it.snippet?.thumbnails?.medium?.url ||
                  it.snippet?.thumbnails?.default?.url ||
                  `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

                allItems.push({
                  videoId: vidId,
                  title: itTitle || `Lesson ${allItems.length + 1}`,
                  thumbnailUrl: itemThumb,
                  sourcePosition: typeof it.snippet?.position === 'number' ? it.snippet.position : allItems.length,
                  isAccessible: true
                });
              }

              pageToken = rawJson.nextPageToken || null;
            } while (pageToken);

            if (allItems.length > 0) {
              allItems.sort((a, b) => a.sourcePosition - b.sourcePosition);
              allItems.forEach((v, idx) => { v.sourcePosition = idx; });
              return {
                id: playlistId,
                title,
                thumbnailUrl: thumb || allItems[0]?.thumbnailUrl || null,
                items: allItems,
                isTruncatedRss: false
              };
            }
          }
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        logger.warn('YouTube Data API v3 failed, falling back to public Atom RSS feed', {
          operation: 'fetchPlaylistMetadata_v3',
          playlistId,
          error: String(err)
        });
      }
    }

    // 2. Fallback to public Atom RSS feed
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    let playlistTitle = `Playlist (${playlistId})`;
    let playlistThumb: string | null = null;

    try {
      const meta = await platform.fetchYouTubeMetadata(playlistUrl);
      if (meta && meta.title) {
        playlistTitle = meta.title;
        playlistThumb = meta.thumbnailUrl || null;
      }
    } catch (err) {
      logger.warn('Platform metadata fetch for playlist failed', { operation: 'fetchPlaylistMetadata', playlistId, error: String(err) });
    }

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    let xml = '';

    try {
      xml = await platform.fetchRemoteText(feedUrl);
    } catch {
      try {
        const res = await fetch(feedUrl);
        if (res.ok) {
          xml = await res.text();
        }
      } catch {
        // ignore
      }
    }

    if (xml) {
      const parsed = parsePlaylistXmlFeed(xml, playlistId);
      if (parsed && parsed.items.length > 0) {
        const isTruncated = parsed.items.length === 15;
        return {
          id: playlistId,
          title: playlistTitle !== `Playlist (${playlistId})` ? playlistTitle : parsed.title,
          thumbnailUrl: playlistThumb || parsed.thumbnailUrl || parsed.items[0]?.thumbnailUrl || null,
          items: parsed.items,
          isTruncatedRss: isTruncated,
          warningNotice: isTruncated
            ? 'Notice: YouTube RSS feeds only retrieve up to 15 videos without an API key. To import complete large playlists, configure a YouTube Data API Key or paste individual lecture URLs.'
            : undefined
        };
      }
    }

    // 3. If no videos were discovered in the public feed:
    throw new AppError(
      'NOT_FOUND',
      `Could not retrieve videos from playlist "${playlistId}". Please check that the playlist exists and is set to Public or Unlisted.`,
      404
    );
  }
}

export function getYouTubeApiKey(): string | null {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('LearnUp_youtube_api_key') || localStorage.getItem('youtube_api_key');
    if (key && key.trim()) return key.trim();
  }
  const envKey = (import.meta as any).env?.VITE_YOUTUBE_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  return null;
}
