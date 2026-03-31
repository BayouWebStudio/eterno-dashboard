/*
  Optimistic Queue with Batch + Lock
  ───────────────────────────────────
  Tracks dirty fields, batches them into a single save cycle,
  prevents overlapping saves with a lock, and auto-flushes
  queued changes once the current save completes.

  Flow:
    1. User edits → markDirty(key, value) adds to dirtyMap
    2. User clicks Save (or idle debounce fires) → flush()
    3. flush() grabs a snapshot of dirtyMap, clears it, sets lock
    4. Sends each field via saveFn sequentially (within the lock)
    5. On completion: releases lock, reports results
    6. If new dirty fields accumulated during the save → auto-flush
*/

import { useState, useRef, useCallback, useEffect } from "react";

export type SaveFn = (key: string, value: string) => Promise<boolean>;

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "queued";

export interface SaveResult {
  succeeded: string[];
  failed: string[];
}

interface UseSaveQueueOptions {
  /** The async function that saves a single field. Returns true on success. */
  saveFn: SaveFn;
  /** Idle debounce delay in ms before auto-flush. 0 = manual only. Default: 0 */
  autoFlushDelay?: number;
  /** Callback after a flush cycle completes */
  onFlushComplete?: (result: SaveResult) => void;
}

export function useSaveQueue({
  saveFn,
  autoFlushDelay = 0,
  onFlushComplete,
}: UseSaveQueueOptions) {
  // ── State ──
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirtyCount, setDirtyCount] = useState(0);
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // ── Refs (mutable, no re-renders) ──
  const dirtyMapRef = useRef<Map<string, string>>(new Map());
  const lockRef = useRef(false);
  const autoFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const onFlushCompleteRef = useRef(onFlushComplete);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Keep refs in sync with latest props
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);
  useEffect(() => {
    onFlushCompleteRef.current = onFlushComplete;
  }, [onFlushComplete]);

  // ── Mark a field as dirty ──
  const markDirty = useCallback(
    (key: string, value: string) => {
      dirtyMapRef.current.set(key, value);
      setDirtyCount(dirtyMapRef.current.size);

      // Update status to show there are pending changes
      setStatus((prev) => (prev === "saving" ? "saving" : "idle"));

      // Auto-flush debounce
      if (autoFlushDelay > 0) {
        if (autoFlushTimerRef.current) clearTimeout(autoFlushTimerRef.current);
        autoFlushTimerRef.current = setTimeout(() => {
          flush();
        }, autoFlushDelay);
      }
    },
    [autoFlushDelay]
  );

  // ── Flush: snapshot dirty fields and save them under lock ──
  const flush = useCallback(async (): Promise<SaveResult> => {
    // If locked, the current changes will be picked up by the auto-re-flush
    if (lockRef.current) {
      setStatus("queued");
      return { succeeded: [], failed: [] };
    }

    // Snapshot and clear
    const snapshot = new Map(dirtyMapRef.current);
    dirtyMapRef.current.clear();
    setDirtyCount(0);

    if (snapshot.size === 0) {
      return { succeeded: [], failed: [] };
    }

    // Acquire lock
    lockRef.current = true;
    setIsLocked(true);
    setStatus("saving");

    const succeeded: string[] = [];
    const failed: string[] = [];

    // Send each field sequentially within the lock
    for (const [key, value] of snapshot) {
      try {
        const ok = await saveFnRef.current(key, value);
        if (ok) {
          succeeded.push(key);
          retryCountRef.current.delete(key);
        } else {
          failed.push(key);
          // Put failed fields back into dirty map so they can be retried
          dirtyMapRef.current.set(key, value);
        }
      } catch {
        failed.push(key);
        dirtyMapRef.current.set(key, value);
      }
    }

    const result: SaveResult = { succeeded, failed };
    setLastResult(result);

    // Release lock
    lockRef.current = false;
    setIsLocked(false);

    // Report
    if (failed.length > 0) {
      setStatus("error");
    } else {
      setStatus("saved");
    }

    // Notify callback
    onFlushCompleteRef.current?.(result);

    // Update dirty count (failed fields were put back)
    setDirtyCount(dirtyMapRef.current.size);

    // Auto-re-flush if new dirty fields accumulated during the save
    if (dirtyMapRef.current.size > 0) {
      const MAX_RETRIES = 3;
      const BACKOFF_DELAYS = [50, 200, 1000];

      // Check if all remaining dirty fields have exceeded max retries
      let allExhausted = true;
      let maxRetryCount = 0;
      for (const key of dirtyMapRef.current.keys()) {
        const count = retryCountRef.current.get(key) ?? 0;
        if (count < MAX_RETRIES) {
          allExhausted = false;
        }
        maxRetryCount = Math.max(maxRetryCount, count);
      }

      if (allExhausted) {
        // All remaining fields have exceeded max retries — give up
        const exhaustedKeys = [...dirtyMapRef.current.keys()];
        dirtyMapRef.current.clear();
        setDirtyCount(0);
        // Clean up retry counts for exhausted keys
        for (const key of exhaustedKeys) {
          retryCountRef.current.delete(key);
        }
        const exhaustedResult: SaveResult = { succeeded: [], failed: exhaustedKeys };
        setLastResult(exhaustedResult);
        setStatus("error");
        onFlushCompleteRef.current?.(exhaustedResult);
      } else {
        // Increment retry counts for dirty fields and schedule with backoff
        for (const key of dirtyMapRef.current.keys()) {
          const count = retryCountRef.current.get(key) ?? 0;
          retryCountRef.current.set(key, count + 1);
        }
        const delay = BACKOFF_DELAYS[Math.min(maxRetryCount, BACKOFF_DELAYS.length - 1)];
        setTimeout(() => flush(), delay);
      }
    } else {
      // No dirty fields left — clear all retry counts
      retryCountRef.current.clear();
    }

    return result;
  }, []);

  // ── Reset: clear all dirty state (e.g. when switching sections) ──
  const reset = useCallback(() => {
    dirtyMapRef.current.clear();
    retryCountRef.current.clear();
    setDirtyCount(0);
    setStatus("idle");
    setLastResult(null);
    if (autoFlushTimerRef.current) {
      clearTimeout(autoFlushTimerRef.current);
      autoFlushTimerRef.current = null;
    }
  }, []);

  // ── Derived state ──
  const isDirty = dirtyCount > 0;
  const isSaving = status === "saving" || status === "queued";

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoFlushTimerRef.current) clearTimeout(autoFlushTimerRef.current);
    };
  }, []);

  return {
    /** Mark a field as changed */
    markDirty,
    /** Trigger a save cycle (manual flush) */
    flush,
    /** Clear all dirty state */
    reset,
    /** Current save status */
    status,
    /** Whether any fields have unsaved changes */
    isDirty,
    /** Whether a save is currently in progress */
    isSaving,
    /** Whether the save lock is held */
    isLocked,
    /** Number of dirty fields waiting to be saved */
    dirtyCount,
    /** Result of the last completed flush */
    lastResult,
    /** Direct access to the dirty map (read-only use) */
    getDirtyMap: () => new Map(dirtyMapRef.current),
  };
}
