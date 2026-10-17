'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { getAuthHeaders } from '@/lib/api/client';
import type { LearningItem, LearningItemVideo, LearningItemWithVideos } from '@/lib/types';
import styles from './EditCourseModal.module.css';

export interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: LearningItem;
}

interface EditableVideo {
  id?: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url?: string | null;
  source_position: number;
  duration_seconds?: number | null;
}

export function EditCourseModal({ isOpen, onClose, onSuccess, item }: EditCourseModalProps) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [videos, setVideos] = useState<EditableVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New video addition form state
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(item.title || '');
    setDescription(item.description || '');
    setError(null);

    if (item.type === 'playlist') {
      setIsLoadingVideos(true);
      getAuthHeaders().then((headers) => {
        fetch(`/api/learning-items/${item.id}`, { headers })
          .then((res) => res.json())
          .then((json) => {
            if (json.data?.videos) {
              const sorted = [...(json.data.videos as LearningItemVideo[])].sort(
                (a, b) => a.source_position - b.source_position
              );
              setVideos(
                sorted.map((v, idx) => ({
                  id: v.id,
                  youtube_video_id: v.youtube_video_id,
                  title: v.title,
                  thumbnail_url: v.thumbnail_url,
                  source_position: idx,
                  duration_seconds: v.duration_seconds
                }))
              );
            }
          })
          .catch((err) => {
            setError(err.message || 'Failed to load playlist videos');
          })
          .finally(() => {
            setIsLoadingVideos(false);
          });
      });
    }
  }, [isOpen, item]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setVideos((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((v, idx) => ({ ...v, source_position: idx }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === videos.length - 1) return;
    setVideos((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((v, idx) => ({ ...v, source_position: idx }));
    });
  };

  const handleRemoveVideo = (index: number) => {
    setVideos((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.map((v, idx) => ({ ...v, source_position: idx }));
    });
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;

    // Extract YouTube ID
    let extractedId = newVideoUrl.trim();
    const urlMatch = newVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    if (urlMatch) {
      extractedId = urlMatch[1];
    }

    if (extractedId.length !== 11) {
      setError('Please enter a valid YouTube video URL or 11-character video ID');
      return;
    }

    const videoTitle = newVideoTitle.trim() || `Lecture ${videos.length + 1}`;
    const newVideoItem: EditableVideo = {
      youtube_video_id: extractedId,
      title: videoTitle,
      thumbnail_url: `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`,
      source_position: videos.length,
      duration_seconds: 0
    };

    setVideos((prev) => [...prev, newVideoItem]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    setIsAddingVideo(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();

      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null
      };

      if (item.type === 'playlist') {
        payload.videos = videos;
      }

      const res = await fetch(`/api/learning-items/${item.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to update course');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${item.type === 'playlist' ? 'Playlist' : 'Course'}`}>
      <div className={styles.container}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.field}>
          <label htmlFor="course-title-input" className={styles.label}>
            Title
          </label>
          <input
            id="course-title-input"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course / Playlist Title"
            disabled={isSaving}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="course-desc-input" className={styles.label}>
            Description
          </label>
          <textarea
            id="course-desc-input"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional course summary..."
            rows={3}
            disabled={isSaving}
          />
        </div>

        {item.type === 'playlist' && (
          <div className={styles.playlistSection}>
            <div className={styles.playlistHeader}>
              <h4 className={styles.sectionHeading}>
                Playlist Videos ({videos.length})
              </h4>
              <button
                type="button"
                className={styles.addVideoBtn}
                onClick={() => setIsAddingVideo(!isAddingVideo)}
              >
                {isAddingVideo ? '✕ Cancel' : '+ Add Video'}
              </button>
            </div>

            {isAddingVideo && (
              <form onSubmit={handleAddVideo} className={styles.addVideoForm}>
                <div className={styles.addVideoInputs}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="YouTube Video URL or ID (e.g. https://youtu.be/...)"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Video Title (optional)"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" variant="primary" disabled={!newVideoUrl.trim()}>
                  Append Video
                </Button>
              </form>
            )}

            {isLoadingVideos ? (
              <div className={styles.loadingWrapper}>
                <Spinner size="md" />
                <span>Loading playlist videos...</span>
              </div>
            ) : videos.length === 0 ? (
              <div className={styles.emptyVideos}>No videos in this playlist.</div>
            ) : (
              <div className={styles.videoList}>
                {videos.map((vid, idx) => (
                  <div key={vid.youtube_video_id + idx} className={styles.videoRow}>
                    <span className={styles.positionBadge}>{idx + 1}</span>

                    <div className={styles.videoThumb}>
                      {vid.thumbnail_url ? (
                        <Image
                          src={vid.thumbnail_url}
                          alt=""
                          fill
                          className={styles.thumbImg}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.thumbFallback}>▶</div>
                      )}
                    </div>

                    <div className={styles.videoInfo}>
                      <span className={styles.videoTitle}>{vid.title}</span>
                      <span className={styles.videoId}>{vid.youtube_video_id}</span>
                    </div>

                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        title="Move Up"
                        aria-label="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === videos.length - 1}
                        title="Move Down"
                        aria-label="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                        onClick={() => handleRemoveVideo(idx)}
                        title="Remove Video"
                        aria-label="Remove Video"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
