'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { Workspace } from '../types';

export function useWorkspaces() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (isAuthLoading) return;
    if (!session?.access_token) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const list: Workspace[] = json.data || [];
      setWorkspaces(list);

      // Select active workspace ID
      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem('learnup_active_workspace_id');
      } catch {
        // Safe fallback
      }

      const existingActive = list.find((w) => w.id === savedId);
      if (existingActive) {
        setActiveWorkspaceId(existingActive.id);
      } else if (list.length > 0) {
        setActiveWorkspaceId(list[0].id);
        try {
          localStorage.setItem('learnup_active_workspace_id', list[0].id);
        } catch {
          // Safe fallback
        }
      } else {
        setActiveWorkspaceId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [session, isAuthLoading]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const selectWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    try {
      localStorage.setItem('learnup_active_workspace_id', id);
    } catch {
      // Safe fallback
    }
  }, []);

  const createWorkspace = useCallback(
    async (input: { name: string; icon?: string }): Promise<Workspace> => {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(input)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create workspace');
      }

      const newWs: Workspace = json.data;
      setWorkspaces((prev) => [...prev, newWs]);
      selectWorkspace(newWs.id);
      return newWs;
    },
    [session, selectWorkspace]
  );

  const updateWorkspace = useCallback(
    async (id: string, input: { name?: string; icon?: string }): Promise<Workspace> => {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(input)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update workspace');
      }

      const updatedWs: Workspace = json.data;
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? updatedWs : w)));
      return updatedWs;
    },
    [session]
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<void> => {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to delete workspace');
      }

      setWorkspaces((prev) => {
        const remaining = prev.filter((w) => w.id !== id);
        if (activeWorkspaceId === id && remaining.length > 0) {
          selectWorkspace(remaining[0].id);
        }
        return remaining;
      });
    },
    [session, activeWorkspaceId, selectWorkspace]
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    isLoading,
    error,
    refetch: fetchWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  };
}
