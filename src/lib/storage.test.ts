import { describe, expect, it } from "vitest";
import {
  exportProgress,
  getStorageKey,
  importProgress,
  loadProgress,
  saveProgress,
} from "./storage";
import { createProgress } from "./scheduler";

describe("progress storage", () => {
  it("uses deployment-specific keys", () => {
    expect(getStorageKey("site-a")).not.toBe(getStorageKey("site-b"));
    expect(getStorageKey("site-a")).toContain("site-a");
  });

  it("round-trips valid progress through localStorage", () => {
    const progress = { card1: createProgress("card1") };
    saveProgress(progress);
    expect(loadProgress()).toEqual(progress);
  });

  it("exports and imports valid JSON", () => {
    const progress = { card1: createProgress("card1") };
    const serialized = JSON.stringify(exportProgress(progress));
    expect(importProgress(serialized)).toEqual(progress);
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(getStorageKey(), "{bad-json");
    expect(loadProgress()).toEqual({});
  });
});
