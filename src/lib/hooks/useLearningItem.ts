import { useState, useEffect, useCallback } from 'react';
import { learningItemsApi } from '@/lib/api/learning-items';
import type { LearningItemWithVideos } from '@/lib/types';
import { ApiError } from '@/lib/api/client';

export function useLearningItem(id: string) {
  const [item, setItem] = useState<LearningItemWithVideos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await learningItemsApi.getLearningItem(id);
      setItem(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load learning item.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return { item, isLoading, error, refresh: fetchItem };
}
