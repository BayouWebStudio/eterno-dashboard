/**
 * Tests for the Optimistic Queue with Batch + Lock save system.
 *
 * Since useSaveQueue is a React hook, we test the core logic patterns
 * by simulating the same flow the hook implements: dirty tracking,
 * lock prevention, sequential saves, failed-field retry, and auto-re-flush.
 */
import { describe, expect, it, vi } from "vitest";

// ── Simulate the core queue logic (mirrors useSaveQueue internals) ──

interface SaveQueueState {
  dirtyMap: Map<string, string>;
  locked: boolean;
}

async function flushQueue(
  state: SaveQueueState,
  saveFn: (key: string, value: string) => Promise<boolean>
): Promise<{ succeeded: string[]; failed: string[] }> {
  if (state.locked) {
    return { succeeded: [], failed: [] };
  }

  // Snapshot and clear
  const snapshot = new Map(state.dirtyMap);
  state.dirtyMap.clear();

  if (snapshot.size === 0) {
    return { succeeded: [], failed: [] };
  }

  // Acquire lock
  state.locked = true;

  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const [key, value] of snapshot) {
    try {
      const ok = await saveFn(key, value);
      if (ok) {
        succeeded.push(key);
      } else {
        failed.push(key);
        state.dirtyMap.set(key, value);
      }
    } catch {
      failed.push(key);
      state.dirtyMap.set(key, value);
    }
  }

  // Release lock
  state.locked = false;

  return { succeeded, failed };
}

describe("Save Queue: Batch + Lock", () => {
  it("batches multiple dirty fields into a single flush cycle", async () => {
    const saveFn = vi.fn().mockResolvedValue(true);
    const state: SaveQueueState = {
      dirtyMap: new Map([
        ["hero_title", "New Title"],
        ["hero_subtitle", "New Subtitle"],
        ["about_text", "New About"],
      ]),
      locked: false,
    };

    const result = await flushQueue(state, saveFn);

    expect(saveFn).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toEqual(["hero_title", "hero_subtitle", "about_text"]);
    expect(result.failed).toEqual([]);
    expect(state.dirtyMap.size).toBe(0);
  });

  it("prevents concurrent flushes with the lock", async () => {
    const saveFn = vi.fn().mockResolvedValue(true);
    const state: SaveQueueState = {
      dirtyMap: new Map([["field_a", "value_a"]]),
      locked: true, // Already locked
    };

    const result = await flushQueue(state, saveFn);

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.succeeded).toEqual([]);
    expect(result.failed).toEqual([]);
    // dirtyMap should remain unchanged
    expect(state.dirtyMap.size).toBe(1);
  });

  it("puts failed fields back into the dirty map for retry", async () => {
    const saveFn = vi.fn()
      .mockResolvedValueOnce(true)   // hero_title succeeds
      .mockResolvedValueOnce(false)  // hero_subtitle fails
      .mockResolvedValueOnce(true);  // about_text succeeds

    const state: SaveQueueState = {
      dirtyMap: new Map([
        ["hero_title", "New Title"],
        ["hero_subtitle", "New Subtitle"],
        ["about_text", "New About"],
      ]),
      locked: false,
    };

    const result = await flushQueue(state, saveFn);

    expect(result.succeeded).toEqual(["hero_title", "about_text"]);
    expect(result.failed).toEqual(["hero_subtitle"]);
    // Failed field should be back in dirty map
    expect(state.dirtyMap.has("hero_subtitle")).toBe(true);
    expect(state.dirtyMap.get("hero_subtitle")).toBe("New Subtitle");
    expect(state.dirtyMap.size).toBe(1);
  });

  it("handles saveFn throwing errors gracefully", async () => {
    const saveFn = vi.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(true);

    const state: SaveQueueState = {
      dirtyMap: new Map([
        ["field_a", "val_a"],
        ["field_b", "val_b"],
        ["field_c", "val_c"],
      ]),
      locked: false,
    };

    const result = await flushQueue(state, saveFn);

    expect(result.succeeded).toEqual(["field_a", "field_c"]);
    expect(result.failed).toEqual(["field_b"]);
    expect(state.dirtyMap.has("field_b")).toBe(true);
  });

  it("does nothing when dirty map is empty", async () => {
    const saveFn = vi.fn();
    const state: SaveQueueState = {
      dirtyMap: new Map(),
      locked: false,
    };

    const result = await flushQueue(state, saveFn);

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.succeeded).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it("releases the lock after flush completes (even with failures)", async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error("All fail"));
    const state: SaveQueueState = {
      dirtyMap: new Map([
        ["field_a", "val_a"],
        ["field_b", "val_b"],
      ]),
      locked: false,
    };

    await flushQueue(state, saveFn);

    expect(state.locked).toBe(false);
  });

  it("queued changes survive a locked flush and can be saved after", async () => {
    const saveFn = vi.fn().mockResolvedValue(true);

    const state: SaveQueueState = {
      dirtyMap: new Map([["field_a", "val_a"]]),
      locked: false,
    };

    // First flush — acquires lock and saves
    const result1 = await flushQueue(state, saveFn);
    expect(result1.succeeded).toEqual(["field_a"]);

    // Simulate user editing while save was in progress
    state.dirtyMap.set("field_b", "val_b");
    state.dirtyMap.set("field_c", "val_c");

    // Second flush — should save the queued fields
    const result2 = await flushQueue(state, saveFn);
    expect(result2.succeeded).toEqual(["field_b", "field_c"]);
    expect(state.dirtyMap.size).toBe(0);
  });

  it("only saves the latest value when a field is edited multiple times", async () => {
    const saveFn = vi.fn().mockResolvedValue(true);
    const state: SaveQueueState = {
      dirtyMap: new Map(),
      locked: false,
    };

    // User types "H", "He", "Hel", "Hell", "Hello" rapidly
    state.dirtyMap.set("hero_title", "H");
    state.dirtyMap.set("hero_title", "He");
    state.dirtyMap.set("hero_title", "Hel");
    state.dirtyMap.set("hero_title", "Hell");
    state.dirtyMap.set("hero_title", "Hello");

    const result = await flushQueue(state, saveFn);

    // Should only save once with the final value
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("hero_title", "Hello");
    expect(result.succeeded).toEqual(["hero_title"]);
  });
});
