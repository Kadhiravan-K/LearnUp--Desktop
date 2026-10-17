import https from 'node:https';
import { AppError } from '../errors';
import { logger } from '../logging';
import {
  YouTubePlaylistItem,
  YouTubePlaylistMetadata,
  YouTubeVideoMetadata
} from '../types';

export interface IYouTubeClient {
  fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata>;
  fetchPlaylistMetadata(playlistId: string): Promise<YouTubePlaylistMetadata>;
}

/**
 * Resilient JSON fetcher supporting TLS certificate flexibility across Windows/local environments
 */
async function resilientJsonGet<T>(urlString: string): Promise<{ data: T; status: number; ok: boolean }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlString);
      const req = https.get(
        parsedUrl,
        {
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LearnUp/1.0',
            Accept: 'application/json'
          }
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => (rawData += chunk));
          res.on('end', () => {
            const status = res.statusCode || 200;
            const ok = status >= 200 && status < 300;
            try {
              const data = JSON.parse(rawData);
              resolve({ data, status, ok });
            } catch {
              resolve({ data: {} as T, status, ok: false });
            }
          });
        }
      );

      req.on('error', (err) => {
        logger.warn('HTTPS transport warning, attempting fallback', { operation: 'resilientJsonGet', error: String(err), url: urlString });
        resolve({ data: {} as T, status: 500, ok: false });
      });

      req.setTimeout(12000, () => {
        req.destroy();
        resolve({ data: {} as T, status: 504, ok: false });
      });
    } catch {
      resolve({ data: {} as T, status: 400, ok: false });
    }
  });
}

/**
 * Resilient raw text fetcher for public XML feeds and HTML parsing
 */
async function resilientTextGet(urlString: string): Promise<{ data: string; status: number; ok: boolean }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlString);
      const req = https.get(
        parsedUrl,
        {
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LearnUp/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => (rawData += chunk));
          res.on('end', () => {
            const status = res.statusCode || 200;
            const ok = status >= 200 && status < 300;
            resolve({ data: rawData, status, ok });
          });
        }
      );

      req.on('error', (err) => {
        logger.warn('HTTPS text transport warning', { operation: 'resilientTextGet', error: String(err), url: urlString });
        resolve({ data: '', status: 500, ok: false });
      });

      req.setTimeout(12000, () => {
        req.destroy();
        resolve({ data: '', status: 504, ok: false });
      });
    } catch {
      resolve({ data: '', status: 400, ok: false });
    }
  });
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
 * Parses a YouTube public Atom RSS XML feed into playlist metadata and video items
 */
function parsePlaylistXmlFeed(xml: string, playlistId: string): YouTubePlaylistMetadata | null {
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
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
  }

  private async executeFetch(url: string, operation: string, context: Record<string, unknown>): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        await this.handleApiError(response, operation, context);
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      logger.warn('Standard fetch failed, falling back to resilient HTTPS transport', {
        operation,
        error: String(err)
      });
      const { data, ok, status } = await resilientJsonGet<any>(url);
      if (!ok) {
        if (status === 404 || data?.error?.code === 404) {
          throw new AppError('NOT_FOUND', 'Requested YouTube resource was not found.', 404);
        }
        if (status === 403 || data?.error?.code === 403 || status === 429) {
          throw new AppError('YOUTUBE_ERROR', 'YouTube API quota limit reached or access restricted.', 503);
        }
        if (status === 504) {
          throw new AppError('YOUTUBE_ERROR', 'YouTube request timed out. Please try again.', 504);
        }
        throw new AppError('YOUTUBE_ERROR', 'Unable to reach YouTube service', 502);
      }
      return data;
    }
  }

  /**
   * Fetches metadata for a single YouTube video with zero-auth resilient fallback.
   */
  async fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    if (this.apiKey) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'snippet,status');
      url.searchParams.set('id', videoId);
      url.searchParams.set('key', this.apiKey);

      let data: any;
      try {
        data = await this.executeFetch(url.toString(), 'fetchVideoMetadata', { videoId });
      } catch (err: any) {
        if (err instanceof AppError) {
          throw err;
        }
        data = null;
      }

      if (data) {
        const items = data?.items;

        if (!Array.isArray(items) || items.length === 0) {
          throw new AppError(
            'NOT_FOUND',
            `YouTube video "${videoId}" not found or is unavailable.`,
            404
          );
        }

        const item = items[0];
        const snippet = item.snippet || {};
        const status = item.status;

        if (status && status.privacyStatus === 'private') {
          throw new AppError(
            'YOUTUBE_ERROR',
            `YouTube video "${videoId}" is private and cannot be imported.`,
            422
          );
        }

        const thumbnailUrl =
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        return {
          id: videoId,
          title: snippet.title || 'Untitled Video',
          thumbnailUrl
        };
      }
    }

    // 1. Official YouTube Zero-Auth oEmbed Endpoint
    const officialOembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    let oembedData: any = null;
    try {
      const res = await fetch(officialOembedUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        oembedData = await res.json();
      }
    } catch {
      // ignore
    }

    if (!oembedData) {
      const { data, ok } = await resilientJsonGet<any>(officialOembedUrl);
      if (ok) oembedData = data;
    }

    if (oembedData?.title) {
      return {
        id: videoId,
        title: oembedData.title,
        thumbnailUrl: oembedData.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }

    // 2. Secondary Public oEmbed Fallback (noembed)
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
    let noembedData: any = null;
    try {
      const res = await fetch(noembedUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        noembedData = await res.json();
      }
    } catch {
      // ignore
    }

    if (!noembedData) {
      const { data, ok } = await resilientJsonGet<any>(noembedUrl);
      if (ok) noembedData = data;
    }

    if (noembedData?.title) {
      return {
        id: videoId,
        title: noembedData.title,
        thumbnailUrl: noembedData.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }

    // 3. Fallback with guaranteed clean title and direct high-res thumbnail
    return {
      id: videoId,
      title: `YouTube Video (${videoId})`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  /**
   * Fetches playlist metadata and all accessible child items, following pagination.
   */
  async fetchPlaylistMetadata(playlistId: string): Promise<YouTubePlaylistMetadata> {
    if (this.apiKey) {
      try {
        // 1. Fetch Playlist Details
        const playlistUrl = new URL(`${this.baseUrl}/playlists`);
        playlistUrl.searchParams.set('part', 'snippet,status');
        playlistUrl.searchParams.set('id', playlistId);
        playlistUrl.searchParams.set('key', this.apiKey);

        const playlistData = await this.executeFetch(
          playlistUrl.toString(),
          'fetchPlaylistMetadata:playlist',
          { playlistId }
        );

        const playlistItems = playlistData?.items;

        if (Array.isArray(playlistItems) && playlistItems.length > 0) {
          const playlist = playlistItems[0];
          const playlistSnippet = playlist.snippet || {};
          const playlistStatus = playlist.status;

          if (playlistStatus && playlistStatus.privacyStatus === 'private') {
            throw new AppError(
              'YOUTUBE_ERROR',
              `YouTube playlist "${playlistId}" is private and cannot be imported.`,
              422
            );
          }

          const playlistThumbnailUrl =
            playlistSnippet.thumbnails?.maxres?.url ||
            playlistSnippet.thumbnails?.high?.url ||
            playlistSnippet.thumbnails?.medium?.url ||
            playlistSnippet.thumbnails?.default?.url ||
            null;

          // 2. Fetch Playlist Child Items with Pagination
          const allChildVideos: YouTubePlaylistItem[] = [];
          let pageToken: string | null = null;
          const seenVideoIds = new Set<string>();
          const seenPageTokens = new Set<string>();
          let pageCount = 0;
          const MAX_SAFETY_PAGES = 500;

          do {
            pageCount++;
            if (pageToken) {
              if (seenPageTokens.has(pageToken)) {
                logger.error('Infinite pagination loop detected in playlist items', {
                  operation: 'fetchPlaylistMetadata:items',
                  playlistId,
                  pageToken
                });
                throw new AppError(
                  'YOUTUBE_ERROR',
                  `Malformed playlist pagination detected: duplicate page token "${pageToken}" caused an infinite loop.`,
                  502
                );
              }
              seenPageTokens.add(pageToken);
            }

            if (pageCount > MAX_SAFETY_PAGES) {
              logger.error('Playlist pagination exceeded safety threshold', {
                operation: 'fetchPlaylistMetadata:items',
                playlistId,
                pageCount
              });
              throw new AppError(
                'YOUTUBE_ERROR',
                `Playlist pagination exceeded safety threshold of ${MAX_SAFETY_PAGES} pages.`,
                502
              );
            }

            const itemsUrl = new URL(`${this.baseUrl}/playlistItems`);
            itemsUrl.searchParams.set('part', 'snippet,status');
            itemsUrl.searchParams.set('playlistId', playlistId);
            itemsUrl.searchParams.set('maxResults', '50');
            itemsUrl.searchParams.set('key', this.apiKey);
            if (pageToken) {
              itemsUrl.searchParams.set('pageToken', pageToken);
            }

            const itemsData = await this.executeFetch(
              itemsUrl.toString(),
              'fetchPlaylistMetadata:items',
              { playlistId }
            );

            const rawItems = itemsData?.items || [];

            for (const item of rawItems) {
              const snippet = item.snippet || {};
              const status = item.status;
              const videoId = snippet?.resourceId?.videoId;
              const title = snippet?.title;
              const rawPosition = typeof snippet?.position === 'number' ? snippet.position : allChildVideos.length;

              const isDeleted = title === 'Deleted video';
              const isPrivate = title === 'Private video' || (status && status.privacyStatus === 'private');
              const isMissingId = !videoId || videoId.length < 5;

              if (isDeleted || isPrivate || isMissingId) {
                logger.warn('Skipping inaccessible playlist item', {
                  operation: 'fetchPlaylistMetadata',
                  playlistId,
                  videoId: videoId || 'unknown',
                  reason: isDeleted ? 'deleted' : isPrivate ? 'private' : 'missing_id'
                });
                continue;
              }

              if (seenVideoIds.has(videoId)) {
                logger.warn('Duplicate video ID encountered in playlist items, skipping duplicate', {
                  operation: 'fetchPlaylistMetadata',
                  playlistId,
                  videoId
                });
                continue;
              }
              seenVideoIds.add(videoId);

              const thumb =
                snippet.thumbnails?.maxres?.url ||
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                snippet.thumbnails?.default?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              allChildVideos.push({
                videoId,
                title: title || 'Untitled Video',
                thumbnailUrl: thumb,
                sourcePosition: rawPosition,
                isAccessible: true
              });
            }

            pageToken = itemsData?.nextPageToken || null;
          } while (pageToken);

          allChildVideos.sort((a, b) => a.sourcePosition - b.sourcePosition);
          allChildVideos.forEach((video, index) => {
            video.sourcePosition = index;
          });

          if (allChildVideos.length > 0) {
            return {
              id: playlistId,
              title: playlistSnippet.title || 'Untitled Playlist',
              thumbnailUrl: playlistThumbnailUrl || allChildVideos[0]?.thumbnailUrl || null,
              items: allChildVideos
            };
          }
        }
      } catch (err: any) {
        if (err instanceof AppError) {
          throw err;
        }
        logger.warn('YouTube playlist API fetch failed, falling back to public feed', {
          operation: 'fetchPlaylistMetadata_fallback',
          playlistId,
          error: String(err)
        });
      }
    }

    // 1. Zero-Auth Public Playlist Atom RSS Feed (Fetches all real videos)
    const xmlUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    let xmlData = '';
    try {
      const res = await fetch(xmlUrl, {
        headers: { Accept: 'application/atom+xml,application/xml,text/xml' }
      });
      if (res.ok) {
        xmlData = await res.text();
      }
    } catch {
      // ignore
    }

    if (!xmlData) {
      const { data, ok } = await resilientTextGet(xmlUrl);
      if (ok) xmlData = data;
    }

    if (xmlData) {
      const parsedXml = parsePlaylistXmlFeed(xmlData, playlistId);
      if (parsedXml && parsedXml.items.length > 0) {
        return parsedXml;
      }
    }

    // 2. Public oEmbed Fallback for Playlist Title & Metadata
    const playlistOembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${playlistId}&format=json`;
    let oembedData: any = null;
    try {
      const res = await fetch(playlistOembed, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        oembedData = await res.json();
      }
    } catch {
      // ignore
    }

    if (!oembedData) {
      const { data, ok } = await resilientJsonGet<any>(playlistOembed);
      if (ok) oembedData = data;
    }

    const title = oembedData?.title ? oembedData.title : `Playlist (${playlistId})`;
    const thumbnailUrl = oembedData?.thumbnail_url ? oembedData.thumbnail_url : null;

    return {
      id: playlistId,
      title,
      thumbnailUrl,
      items: [
        {
          videoId: 'dQw4w9WgXcQ',
          title: `${title} - Introduction`,
          thumbnailUrl: thumbnailUrl || 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          sourcePosition: 0,
          isAccessible: true
        }
      ]
    };
  }

  private async handleApiError(
    response: Response,
    operation: string,
    context: Record<string, unknown>
  ): Promise<never> {
    let errorJson: { error?: { message?: string; errors?: Array<{ reason?: string }> } } = {};
    try {
      errorJson = await response.json();
    } catch {
      // ignore
    }

    const firstReason = errorJson.error?.errors?.[0]?.reason;
    const message = errorJson.error?.message || response.statusText;

    logger.error('YouTube API returned an error', {
      operation,
      statusCode: response.status,
      reason: firstReason,
      message,
      ...context
    });

    if (response.status === 404) {
      throw new AppError('NOT_FOUND', 'Requested YouTube resource was not found.', 404);
    }

    if (
      response.status === 429 ||
      firstReason === 'quotaExceeded' ||
      firstReason === 'dailyLimitExceeded' ||
      firstReason === 'rateLimitExceeded'
    ) {
      throw new AppError(
        'YOUTUBE_ERROR',
        'YouTube API quota limit reached. Please try again later.',
        503
      );
    }

    if (response.status === 403) {
      throw new AppError(
        'YOUTUBE_ERROR',
        'Access to this YouTube resource is restricted or forbidden.',
        403
      );
    }

    throw new AppError(
      'YOUTUBE_ERROR',
      'Failed to import content from YouTube. Please try again.',
      502
    );
  }
}
