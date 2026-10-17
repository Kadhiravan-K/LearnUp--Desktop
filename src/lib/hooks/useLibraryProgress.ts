import { useState, useEffect, useCallback } from 'react';
import type { LibraryProgress } from '@/lib/types';

export function useLibraryProgress() {
  const [progressData, setProgressData] = useState<LibraryProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/progress/library');
      if (!res.ok) {
        throw new Error('Failed to load progress');
      }
      const data = await res.json();
      setProgressData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progressData, isLoading, error, refetch: fetchProgress };
}
