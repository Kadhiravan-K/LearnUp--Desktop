/**
 * Formats a duration or timestamp in seconds to standard MM:SS or HH:MM:SS string.
 * @param seconds Position or duration in seconds.
 * @returns Formatted time string (e.g., "04:12" or "1:05:23").
 */
export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(isNaN(seconds) ? 0 : seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
}
