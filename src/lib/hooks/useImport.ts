import { useState } from 'react';
import { learningItemsApi, type ImportResponse } from '@/lib/api/learning-items';
import { ApiError } from '@/lib/api/client';

export function useImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importItem = async (url: string): Promise<ImportResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await learningItemsApi.importLearningItem(url);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during import.');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { importItem, isLoading, error, setError };
}
