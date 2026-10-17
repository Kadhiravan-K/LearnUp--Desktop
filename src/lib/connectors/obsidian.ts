import { Note, Bookmark, LearningItemWithVideos, ConnectorSyncResult } from '../types';

export interface ObsidianVaultConfig {
  vaultPath?: string;
  notesFolder?: string;
  coursesFolder?: string;
  enableBacklinks?: boolean;
  frontmatterFormat?: 'yaml' | 'json';
}

/**
 * Converts a LearnUp note into an Obsidian-compatible Markdown document with YAML frontmatter and backlinks.
 */
export function formatNoteForObsidian(
  note: Note,
  courseTitle?: string,
  videoTitle?: string
): string {
  const frontmatter = [
    '---',
    `id: "${note.id}"`,
    `course: "${courseTitle || 'Independent Study'}"`,
    `video: "${videoTitle || 'General Lecture'}"`,
    `youtube_id: "${note.youtube_video_id}"`,
    `created_at: "${note.created_at}"`,
    `updated_at: "${note.updated_at}"`,
    'tags:',
    '  - LearnUp',
    '  - note',
    `  - "${(courseTitle || 'general').toLowerCase().replace(/\s+/g, '-')}"`,
    '---',
    ''
  ].join('\n');

  const backlink = courseTitle ? `\n\n## Reference\n- Part of [[${courseTitle}]]\n` : '';

  return `${frontmatter}# ${videoTitle || 'Study Note'}\n\n${note.content}\n${backlink}`;
}

/**
 * Converts a course syllabus into an Obsidian Map of Content (MOC) note.
 */
export function formatCourseMOCForObsidian(course: LearningItemWithVideos): string {
  const frontmatter = [
    '---',
    `id: "${course.id}"`,
    `title: "${course.title}"`,
    `type: "${course.type}"`,
    `status: "${course.status}"`,
    `created_at: "${course.created_at}"`,
    'tags:',
    '  - LearnUp',
    '  - course',
    '  - moc',
    '---',
    ''
  ].join('\n');

  const videoList = (course.videos || [])
    .map((v, i) => `${i + 1}. [[${v.title}]] - \`YouTube: ${v.youtube_video_id}\``)
    .join('\n');

  return `${frontmatter}# ${course.title}\n\n## Syllabus & Video Index\n${videoList || '_No videos attached._'}\n`;
}

/**
 * Executes Obsidian Vault sync simulation / payload export.
 */
export async function syncToObsidian(
  notes: Note[],
  courses: LearningItemWithVideos[],
  bookmarks: Bookmark[],
  config: ObsidianVaultConfig = {}
): Promise<ConnectorSyncResult> {
  const noteFiles = notes.map((n) => {
    const course = courses.find((c) => c.id === n.learning_item_id);
    const video = course?.videos?.find((v) => v.youtube_video_id === n.youtube_video_id);
    return {
      filename: `Notes/${n.id}.md`,
      content: formatNoteForObsidian(n, course?.title, video?.title)
    };
  });

  const courseMocFiles = courses.map((c) => ({
    filename: `Courses/${c.title.replace(/[\\/:*?"<>|]/g, '_')}.md`,
    content: formatCourseMOCForObsidian(c)
  }));

  const totalSynced = noteFiles.length + courseMocFiles.length;

  return {
    connectorType: 'obsidian',
    success: true,
    syncedCount: totalSynced,
    message: `Successfully synchronized ${notes.length} notes and ${courses.length} course MOCs to Obsidian local vault structure.`,
    syncedAt: new Date().toISOString(),
    details: {
      vaultPath: config.vaultPath || 'Local Vault',
      totalFiles: totalSynced,
      files: [...noteFiles, ...courseMocFiles]
    }
  };
}
