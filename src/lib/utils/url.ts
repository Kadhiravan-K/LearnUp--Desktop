export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.includes('youtube.com/watch') ||
    trimmed.includes('youtube.com/playlist') ||
    trimmed.includes('youtube.com/shorts') ||
    trimmed.includes('youtube.com/embed') ||
    trimmed.includes('youtu.be/')
  );
}

export { extractMultipleYouTubeUrls } from '../youtube/parser';
