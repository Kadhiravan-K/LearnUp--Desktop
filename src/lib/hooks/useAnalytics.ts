'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserAnalyticsData } from '../services/analytics-service';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/useAuth';

export function useAnalytics() {
  const { isLoading: isAuthLoading } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<{ data: UserAnalyticsData }>('/api/analytics');
      setAnalytics(res.data || null);
    } catch (err: any) {
      setError(err?.message || 'Error fetching analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchAnalytics();
    }
  }, [isAuthLoading, fetchAnalytics]);

  return {
    analytics,
    isLoading: isLoading || isAuthLoading,
    error,
    refresh: fetchAnalytics
  };
}
