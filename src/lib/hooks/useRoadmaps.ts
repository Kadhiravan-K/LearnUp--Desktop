'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { getGuestAuthToken } from '@/lib/auth/guest-session';
import type { RoadmapTrack, RoadmapNode } from '@/lib/types';

function getResponseError(payload: unknown, fallback: string): Error {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return new Error(payload.error.message);
  }
  return new Error(fallback);
}

export function useRoadmaps() {
  const [tracks, setTracks] = useState<RoadmapTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    } else if (
        typeof window !== 'undefined' &&
        (localStorage.getItem('LearnUp_is_guest') === 'true' || localStorage.getItem('LearnUp_guest_mode') === 'true')
    ) {
        const guestToken = getGuestAuthToken();
        if (guestToken) {
          headers['Authorization'] = `Bearer ${guestToken}`;
        }
    }
    return headers;
  }, []);

  const fetchTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/roadmaps', { headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw getResponseError(json, 'Failed to load roadmaps.');
      if (!Array.isArray(json?.data)) throw new Error('The roadmap response was invalid.');
      setTracks(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmaps.');
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0] || null;
  const selectedNode = activeTrack?.nodes.find((n) => n.id === selectedNodeId) || activeTrack?.nodes[0] || null;

  const createTrack = async (title: string, description: string, category?: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, category })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw getResponseError(json, 'Failed to create roadmap.');
      if (!json?.data) throw new Error('The created roadmap response was invalid.');
      setTracks((prev) => [...prev, json.data]);
      setActiveTrackId(json.data.id);
      setSelectedNodeId(json.data.nodes[0]?.id || '');
      setError(null);
      return json.data as RoadmapTrack;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create roadmap.';
      setError(message);
      throw new Error(message);
    }
  };

  const appendNode = async (trackId: string, title: string, description: string, tags?: string[]) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/roadmaps/${trackId}/nodes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, tags })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw getResponseError(json, 'Failed to add roadmap milestone.');
      if (!json?.data) throw new Error('The updated roadmap response was invalid.');
      setTracks((prev) => prev.map((track) => (track.id === trackId ? json.data : track)));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add roadmap milestone.';
      setError(message);
      throw new Error(message);
    }
  };

  const updateNode = async (trackId: string, nodeId: string, updates: Partial<RoadmapNode>) => {
    try {
      // Optimistic update
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
          };
        })
      );

      const headers = await getHeaders();
      const response = await fetch(`/api/roadmaps/${trackId}/nodes/${nodeId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.data) {
        throw new Error(result?.error?.message || 'Failed to update roadmap milestone.');
      }
      setTracks((prev) => prev.map((track) => track.id === trackId ? result.data : track));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update roadmap milestone.';
      setError(message);
      await fetchTracks();
      throw new Error(message);
    }
  };

  const saveCareerRoadmap = async (careerRoadmap: import('@/lib/roadmaps/career-types').CareerRoadmap): Promise<RoadmapTrack> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/roadmaps/save-career', {
        method: 'POST',
        headers,
        body: JSON.stringify(careerRoadmap)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw getResponseError(json, 'Failed to save career roadmap.');
      if (!json?.data) throw new Error('The saved roadmap response was invalid.');
      setTracks((prev) => [...prev, json.data]);
      setActiveTrackId(json.data.id);
      setSelectedNodeId(json.data.nodes[0]?.id || '');
      setError(null);
      return json.data as RoadmapTrack;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save career roadmap.';
      setError(message);
      throw new Error(message);
    }
  };

  return {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    isLoading,
    error,
    refresh: fetchTracks,
    createTrack,
    appendNode,
    updateNode,
    saveCareerRoadmap
  };
}
