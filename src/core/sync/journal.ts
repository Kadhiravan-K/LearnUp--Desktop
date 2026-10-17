/**
 * LearnUp Shared Core — Mutation Journal Utilities
 * Atomic mutation creation, payload versioning, and journal entry factories.
 */

import { MutationEntity, MutationJournalEntry, MutationOperation } from '../types';

export function createMutationJournalEntry(params: {
  userId: string;
  cloudUserId?: string | null;
  entityType: MutationEntity;
  entityId: string;
  operation: MutationOperation;
  baseVersion: number;
  localVersion: number;
  payload: Record<string, unknown>;
}): MutationJournalEntry {
  const now = new Date().toISOString();
  return {
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: params.userId,
    cloudUserId: params.cloudUserId ?? null,
    entityType: params.entityType,
    entityId: params.entityId,
    operation: params.operation,
    baseVersion: params.baseVersion,
    localVersion: params.localVersion,
    payload: params.payload,
    createdAt: now,
    retryCount: 0,
    status: 'pending',
    errorMessage: undefined,
    errorCategory: undefined,
    lastAttemptAt: undefined
  };
}

export function calculateBackoffDelayMs(
  retryCount: number,
  baseMs: number = 1000,
  maxMs: number = 30000
): number {
  const exp = Math.min(retryCount, 6);
  const backoff = Math.min(baseMs * Math.pow(2, exp), maxMs);
  // Add 10-20% jitter to prevent thundering herds
  const jitter = Math.random() * (backoff * 0.2);
  return Math.round(backoff + jitter);
}
