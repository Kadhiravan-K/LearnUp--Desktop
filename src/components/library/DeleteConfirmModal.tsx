'use client';

import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import { useDelete } from '@/lib/hooks/useDelete';
import { useUndo } from '@/lib/context/UndoContext';
import { learningItemsApi } from '@/lib/api/learning-items';
import type { LearningItem } from '@/lib/types';
import styles from './DeleteConfirmModal.module.css';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: LearningItem | null;
  itemId?: string;
  itemTitle?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  itemId: propId,
  itemTitle: propTitle
}: DeleteConfirmModalProps) {
  const { deleteItem, isDeleting, error, resetError } = useDelete();
  const { triggerUndoableDelete } = useUndo();

  const activeId = item?.id || propId || '';
  const activeTitle = item?.title || propTitle || 'Learning Item';

  useEffect(() => {
    if (isOpen) {
      resetError();
    }
  }, [isOpen, resetError]);

  const handleConfirm = async () => {
    if (!activeId) return;

    // Trigger Gmail-style 5s undo bar & move to Bin
    triggerUndoableDelete({
      id: activeId,
      itemType: 'course',
      title: activeTitle,
      details: item?.author || 'Deleted from library',
      data: item || { id: activeId, title: activeTitle },
      onUndo: async (restoredBinItem) => {
        try {
          const itemData = restoredBinItem.data;
          let sourceUrl = '';
          if (itemData?.source_url) {
            sourceUrl = itemData.source_url;
          } else if (itemData?.type === 'playlist' && itemData?.youtube_playlist_id) {
            sourceUrl = `https://www.youtube.com/playlist?list=${itemData.youtube_playlist_id}`;
          } else if (itemData?.youtube_video_id) {
            sourceUrl = `https://www.youtube.com/watch?v=${itemData.youtube_video_id}`;
          }

          if (sourceUrl) {
            await learningItemsApi.importLearningItem(sourceUrl);
          }
        } catch {}
        // Notify library grid to re-fetch and show the restored item
        window.dispatchEvent(new CustomEvent('LearnUp_library_refresh'));
      }
    });

    const success = await deleteItem(activeId);
    if (success) {
      onSuccess();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Learning Item">
      <div className={styles.content}>
        <p className={styles.message}>
          Are you sure you want to remove <strong>{activeTitle}</strong> from your library? 
          This action will move it to your Recycle Bin where it can be recovered or undone.
        </p>

        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
