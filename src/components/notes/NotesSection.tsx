'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '@/lib/types';
import { getAuthHeaders } from '@/lib/api/client';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import { NoteEditor } from './NoteEditor';
import { NoteItem } from './NoteItem';
import styles from './NotesSection.module.css';

export interface NotesSectionProps {
  learningItemId: string;
  youtubeVideoId: string;
}

export function NotesSection({ learningItemId, youtubeVideoId }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localKey = `LearnUp_local_notes_${learningItemId}_${youtubeVideoId}`;

  const loadLocalNotes = useCallback((): Note[] => {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, [localKey]);

  const saveLocalNotes = useCallback((updated: Note[]) => {
    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
  }, [localKey]);

  const fetchNotes = useCallback(async () => {
    if (!learningItemId || !youtubeVideoId) return;
    try {
      setIsLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/notes?learningItemId=${encodeURIComponent(learningItemId)}&youtubeVideoId=${encodeURIComponent(youtubeVideoId)}`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        const serverNotes = json.data || [];
        const local = loadLocalNotes();
        // Merge and deduplicate by id
        const mergedMap = new Map<string, Note>();
        local.forEach((n) => mergedMap.set(n.id, n));
        serverNotes.forEach((n: Note) => mergedMap.set(n.id, n));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotes(merged);
        saveLocalNotes(merged);
      } else {
        // Fallback to local
        const local = loadLocalNotes();
        setNotes(local);
      }
    } catch {
      // Fallback to local
      const local = loadLocalNotes();
      setNotes(local);
    } finally {
      setIsLoading(false);
    }
  }, [learningItemId, youtubeVideoId, loadLocalNotes, saveLocalNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async (content: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          learningItemId,
          youtubeVideoId,
          content
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setNotes((prev) => {
            const next = [json.data, ...prev];
            saveLocalNotes(next);
            return next;
          });
          return true;
        }
      }

      // Resilient local note fallback if remote fails
      const fallbackNote: Note = {
        id: `local-note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: 'local-user',
        learning_item_id: learningItemId,
        youtube_video_id: youtubeVideoId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setNotes((prev) => {
        const next = [fallbackNote, ...prev];
        saveLocalNotes(next);
        return next;
      });
      return true;
    } catch {
      const fallbackNote: Note = {
        id: `local-note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: 'local-user',
        learning_item_id: learningItemId,
        youtube_video_id: youtubeVideoId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setNotes((prev) => {
        const next = [fallbackNote, ...prev];
        saveLocalNotes(next);
        return next;
      });
      return true;
    }
  };

  const handleUpdateNote = async (noteId: string, content: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setNotes((prev) => {
            const next = prev.map((n) => (n.id === noteId ? json.data : n));
            saveLocalNotes(next);
            return next;
          });
          return true;
        }
      }

      // Fallback local update
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === noteId ? { ...n, content, updated_at: new Date().toISOString() } : n
        );
        saveLocalNotes(next);
        return next;
      });
      return true;
    } catch {
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === noteId ? { ...n, content, updated_at: new Date().toISOString() } : n
        );
        saveLocalNotes(next);
        return next;
      });
      return true;
    }
  };

  const handleDeleteNote = async (noteId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers
      });

      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        saveLocalNotes(next);
        return next;
      });
      return true;
    } catch {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        saveLocalNotes(next);
        return next;
      });
      return true;
    }
  };

  const handleRestoreNote = async (restored: Note) => {
    // 1. Immediately update UI state
    setNotes((prev) => [restored, ...prev.filter((n) => n.id !== restored.id)]);

    // 2. Persist to local storage
    const currentLocal = loadLocalNotes();
    const updated = [restored, ...currentLocal.filter((n) => n.id !== restored.id)];
    saveLocalNotes(updated);

    // 3. Persist back to database
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          learningItemId: restored.learning_item_id,
          youtubeVideoId: restored.youtube_video_id,
          content: restored.content
        })
      });
    } catch {}
  };

  useEffect(() => {
    const handleNotesRefresh = () => fetchNotes();
    window.addEventListener('LearnUp_notes_refresh', handleNotesRefresh);
    return () => window.removeEventListener('LearnUp_notes_refresh', handleNotesRefresh);
  }, [fetchNotes]);

  return (
    <section className={styles.section} aria-labelledby="notes-heading">
      <div className={styles.header}>
        <h3 id="notes-heading" className={styles.title}>
          <span>📝</span> Study Notes
          {notes.length > 0 && <span className={styles.countBadge}>{notes.length}</span>}
        </h3>
      </div>

      <div className={styles.editorWrapper}>
        <NoteEditor onSubmit={handleCreateNote} />
      </div>

      {error && (
        <div className={styles.alertWrapper}>
          <Alert variant="error" title="Notes Notice">{error}</Alert>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loadingWrapper} aria-busy="true" aria-label="Loading notes">
          <Spinner size="sm" />
        </div>
      ) : notes.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No notes yet for this video. Type above to save key insights.</p>
        </div>
      ) : (
        <div className={styles.notesList}>
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onRestore={handleRestoreNote}
            />
          ))}
        </div>
      )}
    </section>
  );
}
