import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import type {
  UserProfile,
  LearningItem,
  DurableNote,
  DurableBookmark,
} from '@/core';
import styles from './notes.module.css';

export interface NotesViewProps {
  activeProfile: UserProfile | null;
  learningItems: LearningItem[];
  notes: DurableNote[];
  bookmarks: DurableBookmark[];
  onSaveNote: (learningItemId: string, videoId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onDeleteBookmark: (bookmarkId: string) => Promise<void>;
  onSelectVideo: (videoId: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  activeProfile,
  learningItems,
  notes,
  bookmarks,
  onSaveNote,
  onDeleteNote,
  onDeleteBookmark,
  onSelectVideo,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'bookmarks'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Note creation state
  const [selectedItemId, setSelectedItemId] = useState<string>(
    learningItems[0]?.id || ''
  );
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Lookup map for course titles
  const itemMap = useMemo(() => {
    const map = new Map<string, LearningItem>();
    learningItems.forEach((c) => map.set(c.id, c));
    return map;
  }, [learningItems]);

  const handleCreateQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContent.trim() || !selectedItemId || !activeProfile) return;

    const item = itemMap.get(selectedItemId);
    const videoId = item?.sourceId || 'manual_entry';

    try {
      setIsSubmittingNote(true);
      setCreateError(null);
      await onSaveNote(selectedItemId, videoId, quickNoteContent.trim());
      setQuickNoteContent('');
      showToast('Study note saved to local SQLite database!', 'success');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating study note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this study note from local storage?')) return;
    try {
      await onDeleteNote(noteId);
      showToast('Note deleted successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete note', 'error');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!window.confirm('Are you sure you want to delete this bookmark?')) return;
    try {
      await onDeleteBookmark(bookmarkId);
      showToast('Bookmark deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete bookmark', 'error');
    }
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => {
      const courseTitle = itemMap.get(n.learningItemId)?.title?.toLowerCase() || '';
      return n.content.toLowerCase().includes(q) || (n.title && n.title.toLowerCase().includes(q)) || courseTitle.includes(q);
    });
  }, [notes, searchQuery, itemMap]);

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;
    const q = searchQuery.toLowerCase();
    return bookmarks.filter((b) => {
      const courseTitle = itemMap.get(b.learningItemId)?.title?.toLowerCase() || '';
      return (b.label && b.label.toLowerCase().includes(q)) || courseTitle.includes(q);
    });
  }, [bookmarks, searchQuery, itemMap]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--sf-accent-primary, #0d9488)' }}>Notes Hub</span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Study Notes &amp; Bookmarks</h1>
            <span className={styles.syncedBadge}>✓ SQLite Durable</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href="/library" className={styles.btnPrimary} style={{ textDecoration: 'none' }}>
            ▶ Open Video Player
          </Link>
        </div>
      </header>

      {/* Search Input */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          aria-label="Search notes and bookmarks"
          className={styles.searchInput}
          placeholder="Search by note content, timestamp label, or course title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <div className={styles.categoryTabs} role="tablist" aria-label="Notes filtering">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`${styles.catBtn} ${activeTab === 'all' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Items</span>
          <span className={styles.catBadge}>{notes.length + bookmarks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={`${styles.catBtn} ${activeTab === 'notes' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <span>Study Notes</span>
          <span className={styles.catBadge}>{notes.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookmarks'}
          className={`${styles.catBtn} ${activeTab === 'bookmarks' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <span>Video Bookmarks</span>
          <span className={styles.catBadge}>{bookmarks.length}</span>
        </button>
      </div>

      <div className={styles.mainGrid}>
        {/* Left Column: Notes & Content */}
        <div className={styles.notesList}>
          {activeTab !== 'bookmarks' && (
            <section aria-label="Study notes list">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: 'var(--sf-text-primary, #0f172a)' }}>
                Study Notes ({filteredNotes.length})
              </h2>

              {filteredNotes.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    background: 'var(--sf-bg-surface, #ffffff)',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    borderRadius: '12px',
                    color: 'var(--sf-text-muted, #64748b)'
                  }}
                >
                  <p style={{ margin: '0 0 12px 0' }}>
                    {searchQuery ? 'No notes matched your query.' : 'No notes recorded yet in local storage.'}
                  </p>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    Take notes using the quick form on the right or inside the video player while studying.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredNotes.map((note) => {
                    const course = itemMap.get(note.learningItemId);
                    return (
                      <article key={note.id} className={styles.noteCard}>
                        <div className={styles.noteHeader}>
                          <div className={styles.courseTag}>
                            <span>📺</span>
                            <span style={{ fontWeight: 600 }}>{course?.title || 'Learning Course'}</span>
                          </div>
                          {note.youtubeVideoId && (
                            <button
                              type="button"
                              className={styles.timestampJumpBtn}
                              onClick={() => onSelectVideo(note.youtubeVideoId)}
                              title="Open player to this course"
                            >
                              ▶ Open in Player
                            </button>
                          )}
                        </div>

                        {note.title && (
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--sf-text-primary, #0f172a)' }}>
                            {note.title}
                          </h3>
                        )}

                        <p className={styles.noteBody} style={{ whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </p>

                        <div className={styles.noteFooter}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>
                            {new Date(note.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          <div className={styles.actionsGroup}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete Note"
                              aria-label="Delete Note"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'bookmarks' && (
            <section aria-label="Bookmarks list">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: 'var(--sf-text-primary, #0f172a)' }}>
                Video Bookmarks ({filteredBookmarks.length})
              </h2>

              {filteredBookmarks.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    background: 'var(--sf-bg-surface, #ffffff)',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    borderRadius: '12px',
                    color: 'var(--sf-text-muted, #64748b)'
                  }}
                >
                  <p style={{ margin: '0 0 12px 0' }}>
                    {searchQuery ? 'No bookmarks matched your query.' : 'No bookmarks saved yet.'}
                  </p>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    Playback bookmarks can be added while watching lectures in the video player.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredBookmarks.map((bookmark) => {
                    const course = itemMap.get(bookmark.learningItemId);
                    return (
                      <article key={bookmark.id} className={styles.noteCard}>
                        <div className={styles.noteHeader}>
                          <div className={styles.courseTag}>
                            <span>🔖</span>
                            <span style={{ fontWeight: 600 }}>{course?.title || 'Learning Course'}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.timestampJumpBtn}
                            onClick={() => onSelectVideo(bookmark.youtubeVideoId)}
                          >
                            ⏱ Jump to {formatSeconds(bookmark.positionSeconds)}
                          </button>
                        </div>

                        <h3 className={styles.noteTitle}>
                          {bookmark.label || `Timestamp bookmark at ${formatSeconds(bookmark.positionSeconds)}`}
                        </h3>

                        <div className={styles.noteFooter}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>
                            Saved {new Date(bookmark.createdAt).toLocaleDateString()}
                          </span>

                          <div className={styles.actionsGroup}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleDeleteBookmark(bookmark.id)}
                              title="Delete Bookmark"
                              aria-label="Delete Bookmark"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Bookmarks Ledger & Quick Note */}
        <aside className={styles.rightPane}>
          {/* Quick Note Form */}
          <div className={styles.quickNoteCard}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--sf-text-primary, #0f172a)' }}>
              ✍ Quick Study Note
            </h3>

            {createError && (
              <Alert variant="error" title="Note Error">
                {createError}
              </Alert>
            )}

            {learningItems.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--sf-text-muted, #64748b)', margin: 0 }}>
                Please import a course from your library before adding notes.
              </p>
            ) : (
              <form onSubmit={handleCreateQuickNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label
                    htmlFor="course-select"
                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--sf-text-muted, #64748b)' }}
                  >
                    Target Course:
                  </label>
                  <select
                    id="course-select"
                    aria-label="Target Course"
                    className={styles.quickNoteInput}
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    disabled={isSubmittingNote}
                  >
                    {learningItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="note-content"
                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--sf-text-muted, #64748b)' }}
                  >
                    Note:
                  </label>
                  <textarea
                    id="note-content"
                    className={styles.quickNoteTextarea}
                    placeholder="Write your observation, code snippet, or key takeaway here..."
                    value={quickNoteContent}
                    onChange={(e) => setQuickNoteContent(e.target.value)}
                    disabled={isSubmittingNote}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSubmittingNote || !quickNoteContent.trim()}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isSubmittingNote ? 'Saving to SQLite...' : '💾 Save Note to SQLite'}
                </button>
              </form>
            )}
          </div>

          {/* Bookmarks Ledger preview */}
          <div className={styles.bookmarksLedger}>
            <div className={styles.ledgerHeader}>
              <span className={styles.ledgerTitle}>
                <span>🔖</span> Key Timestamps
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>
                {bookmarks.length} total
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--sf-text-muted, #64748b)', margin: 0 }}>
                No timestamped bookmarks yet. Play videos to add bookmark points.
              </p>
            ) : (
              bookmarks.slice(0, 5).map((bm) => (
                <div key={bm.id} className={styles.ledgerItem}>
                  <span className={styles.ledgerItemLabel}>
                    {bm.label || 'Timestamp bookmark'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectVideo(bm.youtubeVideoId)}
                    className={styles.jumpSmallBtn}
                  >
                    {formatSeconds(bm.positionSeconds)}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
