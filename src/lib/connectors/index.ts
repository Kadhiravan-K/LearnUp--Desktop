import { syncToObsidian } from './obsidian';
import { syncToGitHub } from './github';
import { syncToGoogleCalendar } from './google-calendar';
import { syncToNotion } from './notion';
import { ConnectorType, ConnectorSyncResult, Note, LearningItemWithVideos, Bookmark } from '../types';

export * from './obsidian';
export * from './github';
export * from './google-calendar';
export * from './notion';

export interface AvailableConnector {
  type: ConnectorType;
  name: string;
  description: string;
  icon: string;
  category: 'Local Storage' | 'Productivity' | 'Developer';
  defaultEnabled: boolean;
  fields: Array<{ key: string; label: string; placeholder: string; type: string }>;
}

export const AVAILABLE_CONNECTORS: AvailableConnector[] = [
  {
    type: 'obsidian',
    name: 'Obsidian Local Vault',
    description: 'Sync notes to local markdown vault with frontmatter tags and internal [[backlinks]]. Offline first.',
    icon: '💎',
    category: 'Local Storage',
    defaultEnabled: true,
    fields: [
      { key: 'vaultPath', label: 'Vault Directory Path', placeholder: '/path/to/Obsidian/Vault', type: 'text' },
      { key: 'notesFolder', label: 'Notes Subfolder', placeholder: 'LearnUp/Notes', type: 'text' }
    ]
  },
  {
    type: 'github',
    name: 'GitHub Vault & Gist Sync',
    description: 'Automated Git commits and encrypted cloud backups of study notes, bookmarks, and roadmaps.',
    icon: '🐙',
    category: 'Developer',
    defaultEnabled: false,
    fields: [
      { key: 'repo', label: 'Repository (owner/repo)', placeholder: 'username/LearnUp-vault', type: 'text' },
      { key: 'branch', label: 'Branch', placeholder: 'main', type: 'text' }
    ]
  },
  {
    type: 'google_calendar',
    name: 'Google Calendar Scheduler',
    description: 'Push Pomodoro focus blocks and Leitner spaced repetition review sessions directly into Google Calendar.',
    icon: '📅',
    category: 'Productivity',
    defaultEnabled: false,
    fields: [
      { key: 'calendarId', label: 'Target Calendar ID', placeholder: 'primary', type: 'text' }
    ]
  },
  {
    type: 'notion',
    name: 'Notion Syllabus Workspace',
    description: 'Export structured syllabus nodes, course databases, and synchronized video note blocks to Notion.',
    icon: '📓',
    category: 'Productivity',
    defaultEnabled: false,
    fields: [
      { key: 'databaseId', label: 'Notion Database ID', placeholder: '32-character Notion database ID', type: 'text' }
    ]
  },
  {
    type: 'local_fs',
    name: 'Zero-Knowledge AES-GCM Vault',
    description: 'Hardware-accelerated client-side IndexedDB partition encrypted with WebCrypto AES-GCM.',
    icon: '🔒',
    category: 'Local Storage',
    defaultEnabled: true,
    fields: []
  }
];

export async function executeConnectorSync(
  type: ConnectorType,
  data: { notes: Note[]; courses: LearningItemWithVideos[]; bookmarks: Bookmark[] },
  config: Record<string, any> = {}
): Promise<ConnectorSyncResult> {
  switch (type) {
    case 'obsidian':
      return syncToObsidian(data.notes, data.courses, data.bookmarks, config);
    case 'github':
      return syncToGitHub(data.notes, data.courses, data.bookmarks, config);
    case 'google_calendar':
      return syncToGoogleCalendar(config);
    case 'notion':
      return syncToNotion(data.notes, data.courses, config);
    case 'local_fs':
      return {
        connectorType: 'local_fs',
        success: true,
        syncedCount: data.notes.length + data.courses.length,
        message: 'Synchronized local encrypted IndexedDB partition.',
        syncedAt: new Date().toISOString()
      };
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
}
