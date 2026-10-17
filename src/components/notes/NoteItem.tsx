'use client';

import React, { useState } from 'react';
import { Note } from '@/lib/types';
import { Button } from '@/components/ui/Button/Button';
import { NoteEditor } from './NoteEditor';
import { useIsPluginEnabled } from '@/lib/hooks/useIsPluginEnabled';
import { useUndo } from '@/lib/context/UndoContext';
import { renderFormattedNote, downloadAsMarkdownFile, downloadAsTexFile } from '@/lib/utils/formatNote';
import styles from './NoteItem.module.css';

export interface NoteItemProps {
  note: Note;
  onUpdate: (noteId: string, content: string) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<boolean>;
  onRestore?: (note: Note) => void;
}

export function NoteItem({ note, onUpdate, onDelete, onRestore }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTexMdPluginActive = useIsPluginEnabled('markdown_tex_notes', true);
  const { triggerUndoableDelete } = useUndo();

  const handleUpdate = async (newContent: string) => {
    const success = await onUpdate(note.id, newContent);
    if (success) {
      setIsEditing(false);
      return true;
    }
    return false;
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    // Trigger Gmail-style 5s undo toast & move to Bin
    triggerUndoableDelete({
      id: note.id,
      itemType: 'note',
      title: note.content.slice(0, 40) || 'Study Note',
      details: `Created on ${new Date(note.created_at).toLocaleDateString()}`,
      data: note,
      onUndo: (restoredBinItem) => {
        if (onRestore && restoredBinItem.data) {
          onRestore(restoredBinItem.data);
        }
      },
      onPermanentDelete: () => {
        onDelete(note.id);
      }
    });

    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.editingCard}>
        <NoteEditor
          initialContent={note.content}
          submitLabel="Update Note"
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          autoFocus
        />
      </div>
    );
  }

  const dateStr = new Date(note.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <article className={styles.card} aria-label="Study note">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <time dateTime={note.created_at} className={styles.date}>
            {dateStr}
            {note.updated_at !== note.created_at && ' (edited)'}
          </time>
          {isTexMdPluginActive && (
            <span className={styles.texBadge}>TeX / Markdown</span>
          )}
        </div>

        <div className={styles.actions}>
          {isTexMdPluginActive && (
            <div className={styles.exportActions}>
              <button
                type="button"
                className={styles.miniExportBtn}
                onClick={() => downloadAsMarkdownFile('study_note', note.content)}
                title="Download note as .md file"
              >
                ⬇️ .md
              </button>
              <button
                type="button"
                className={styles.miniExportBtn}
                onClick={() => downloadAsTexFile('study_note', note.content)}
                title="Download note as .tex LaTeX file"
              >
                ⬇️ .tex
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            aria-label="Edit note"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            aria-label="Delete note"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {isTexMdPluginActive ? (
          renderFormattedNote(note.content)
        ) : (
          <p className={styles.text}>{note.content}</p>
        )}
      </div>
    </article>
  );
}
