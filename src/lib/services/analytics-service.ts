export function toLocalDateString(d: Date | string | number): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface UserAnalyticsData {
  totalHours: number;
  totalMinutes: number;
  dailyAverageMinutes: number;
  activeStreakDays: number;
  longestStreakDays: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  totalCoursesCount: number;
  totalLecturesWatched: number;
  totalFocusSessions: number;
  skillDomains: Array<{
    name: string;
    count: number;
    hours: number;
    percentage: number;
    color: string;
  }>;
  consistencyHeatmap: Array<{
    date: string;
    day: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
  modalityDistribution: {
    videoMinutes: number;
    focusMinutes: number;
    notesCount: number;
    bookmarksCount: number;
  };
}
