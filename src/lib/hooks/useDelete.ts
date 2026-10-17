import { useState, useCallback } from 'react';
import { learningItemsApi } from '@/lib/api/learning-items';
import { ApiError } from '@/lib/api/client';

export function useDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItem = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);
    try {
      await learningItemsApi.deleteLearningItem(id);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while deleting.');
      }
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const resetError = useCallback(() => setError(null), []);

  return { deleteItem, isDeleting, error, resetError };
}
