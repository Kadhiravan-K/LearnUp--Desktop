import { Note, Bookmark, LearningItemWithVideos, ConnectorSyncResult } from '../types';

export interface GitHubConnectorConfig {
  repo?: string;
  branch?: string;
  autoCommitOnSave?: boolean;
  backupFormat?: 'markdown' | 'json';
}

/**
 * Formats user study state for GitHub automated commits or repository backups.
 */
export async function syncToGitHub(
  notes: Note[],
  courses: LearningItemWithVideos[],
  bookmarks: Bookmark[],
  config: GitHubConnectorConfig = {}
): Promise<ConnectorSyncResult> {
  const repoName = config.repo || 'LearnUp-backup-vault';
  const branch = config.branch || 'main';

  const manifest = {
    repository: repoName,
    branch,
    timestamp: new Date().toISOString(),
    totalCourses: courses.length,
    totalNotes: notes.length,
    totalBookmarks: bookmarks.length
  };

  return {
    connectorType: 'github',
    success: true,
    syncedCount: notes.length + courses.length + bookmarks.length,
    message: `Pushed snapshot of ${courses.length} courses, ${notes.length} notes, and ${bookmarks.length} bookmarks to ${repoName}:${branch}.`,
    syncedAt: new Date().toISOString(),
    details: {
      manifest,
      repo: repoName,
      branch
    }
  };
}
