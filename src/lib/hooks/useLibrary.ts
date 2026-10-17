import { useState, useEffect, useCallback } from 'react';
import { learningItemsApi } from '@/lib/api/learning-items';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import { apiFetch, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/useAuth';

export type LibraryItemWithProgress = LearningItem & { progress?: LibraryProgress };

export function useLibrary() {
  const { isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<LibraryItemWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [itemsData, progressDataRes] = await Promise.all([
        learningItemsApi.listLearningItems(),
        apiFetch<{ data: LibraryProgress[] }>('/api/progress/library').catch((err) => {
          console.warn('Failed to fetch progress data, library will render without progress indicators:', err);
          return null;
        })
      ]);

      const progressData: LibraryProgress[] = progressDataRes?.data || [];

      const progressMap = new Map(progressData.map(p => [p.learning_item_id, p]));

      const combined = itemsData.map(item => ({
        ...item,
        progress: progressMap.get(item.id)
      }));

      setItems(combined);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load library items.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchItems();
    }
  }, [isAuthLoading, fetchItems]);

  return { items, isLoading: isLoading || isAuthLoading, error, refresh: fetchItems };
}
