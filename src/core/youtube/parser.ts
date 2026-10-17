/**
 * LearnUp Shared Core — YouTube URL Parser and Validator
 * Pure algorithmic URL normalization, canonicalization, and extraction.
 */

import { AppError } from '../errors';
import { ParsedYouTubeUrl } from '../types';

function isYouTubeHost(hostname: string): boolean {
  return (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be' ||
    hostname.endsWith('.youtu.be')
  );
}

export const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
export const PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{2,}$/;

/**
 * Parses and classifies a submitted YouTube URL into either a video or a playlist.
 * Returns canonical metadata and normalized source key for idempotency.
 * Throws AppError('VALIDATION_ERROR') if URL format or domain is invalid.
 */
export function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'URL is required and cannot be empty', 400);
  }

  let parsed: URL;
  try {
    const trimmed = rawUrl.trim();
    const withProtocol = /^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'The provided string is not a valid URL', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('VALIDATION_ERROR', 'Only HTTP and HTTPS protocols are supported', 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!isYouTubeHost(hostname)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Unsupported domain "${hostname}". Only YouTube URLs are supported.`,
      400
    );
  }

  const pathname = parsed.pathname;
  const searchParams = parsed.searchParams;

  // 1. Dedicated Playlist URL: /playlist?list=...
  if (pathname === '/playlist' || pathname.startsWith('/playlist/')) {
    const listId = searchParams.get('list');
    if (!listId || !PLAYLIST_ID_REGEX.test(listId)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Invalid or missing playlist ID in YouTube playlist URL',
        400
      );
    }
    return {
      type: 'playlist',
      id: listId,
      canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      normalizedSourceKey: `playlist:${listId}`
    };
  }

  // 2. youtu.be short URL: https://youtu.be/VIDEO_ID
  if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
    const videoId = pathname.replace(/^\/+/, '').split('/')[0];
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or missing video ID in short YouTube URL', 400);
    }
    return {
      type: 'video',
      id: videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      normalizedSourceKey: `video:${videoId}`
    };
  }

  // 3. Shorts: /shorts/VIDEO_ID
  if (pathname.startsWith('/shorts/')) {
    const videoId = pathname.replace(/^\/shorts\/+/, '').split('/')[0];
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or missing video ID in YouTube Shorts URL', 400);
    }
    return {
      type: 'video',
      id: videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      normalizedSourceKey: `video:${videoId}`
    };
  }

  // 4. Embed: /embed/VIDEO_ID
  if (pathname.startsWith('/embed/')) {
    const videoId = pathname.replace(/^\/embed\/+/, '').split('/')[0];
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or missing video ID in YouTube embed URL', 400);
    }
    return {
      type: 'video',
      id: videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      normalizedSourceKey: `video:${videoId}`
    };
  }

  // 5. Watch URL: /watch?v=VIDEO_ID
  if (pathname === '/watch' || pathname === '/watch/') {
    const videoId = searchParams.get('v');
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or missing "v" parameter in YouTube watch URL', 400);
    }
    return {
      type: 'video',
      id: videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      normalizedSourceKey: `video:${videoId}`
    };
  }

  // 6. Generic list param fallback
  const listId = searchParams.get('list');
  if (listId && PLAYLIST_ID_REGEX.test(listId)) {
    return {
      type: 'playlist',
      id: listId,
      canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      normalizedSourceKey: `playlist:${listId}`
    };
  }

  throw new AppError(
    'VALIDATION_ERROR',
    'URL is not a supported YouTube video or playlist format',
    400
  );
}

/**
 * Extracts and deduplicates multiple valid YouTube URLs from raw text block.
 */
export function extractMultipleYouTubeUrls(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  const tokens = input.split(/[\r\n,;\s]+/);
  const seen = new Set<string>();
  const results: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    try {
      const parsed = parseYouTubeUrl(trimmed);
      if (!seen.has(parsed.canonicalUrl)) {
        seen.add(parsed.canonicalUrl);
        results.push(parsed.canonicalUrl);
      }
    } catch {
      // Ignore non-URL tokens
    }
  }

  return results;
}
