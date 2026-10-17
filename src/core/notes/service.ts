/**
 * LearnUp Shared Core — Notes Service
 * Logic for managing lecture notes, timestamp bookmarks, and local persistence.
 */

import { DurableNote, IStorageAdapter } from '../types';

export interface TimestampReference {
  raw: string;
  seconds: number;
}

export function parseTimestampsFromText(text: string): TimestampReference[] {
  if (!text) return [];
  const regex = /\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?/g;
  const matches: TimestampReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    let seconds = 0;
    if (match[3] !== undefined) {
      // hh:mm:ss
      seconds = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
    } else {
      // mm:ss
      seconds = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    matches.push({
      raw: match[0],
      seconds
    });
  }

  return matches;
}

export function createDurableNoteRecord(
  userId: string,
  learningItemId: string,
  youtubeVideoId: string,
  content: string
): DurableNote {
  const now = new Date().toISOString();
  return {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    learningItemId,
    youtubeVideoId,
    content,
    createdAt: now,
    updatedAt: now,
    version: 1,
    syncStatus: 'saved_locally',
    isDeleted: false,
    tombstoneAt: null
  };
}

export class NotesService {
  constructor(private storage: IStorageAdapter) {}

  public async getNotes(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableNote[]> {
    return this.storage.listNotes(userId, filters);
  }

  public async saveNote(
    userId: string,
    learningItemId: string,
    youtubeVideoId: string,
    content: string
  ): Promise<DurableNote> {
    const note = createDurableNoteRecord(userId, learningItemId, youtubeVideoId, content);
    return this.storage.saveNote(note);
  }

  public async deleteNote(userId: string, noteId: string): Promise<void> {
    return this.storage.markNoteDeleted(userId, noteId);
  }
}
