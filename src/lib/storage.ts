import type { CardProgress, ProgressExport, ProgressMap } from "./types";

const SCHEMA_VERSION = 1;

export function getDeploymentId(): string {
  const configured = import.meta.env.VITE_DEPLOYMENT_ID?.trim();
  if (configured) return configured;

  if (typeof window === "undefined") return "server";
  const deploymentBase = new URL(import.meta.env.BASE_URL, document.baseURI);
  return `${window.location.origin}${deploymentBase.pathname.replace(/\/+$/, "/")}`;
}

export function getStorageKey(deploymentId = getDeploymentId()): string {
  // localStorage is already isolated by origin. Including the deployment base
  // also separates two GitHub Pages projects hosted under the same origin.
  return `ite-review:progress:v${SCHEMA_VERSION}:${encodeURIComponent(deploymentId)}`;
}

function isProgress(value: unknown): value is CardProgress {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CardProgress>;
  return (
    typeof item.cardId === "string" &&
    typeof item.knewCount === "number" &&
    typeof item.reviewDebt === "number" &&
    typeof item.timesSeen === "number" &&
    typeof item.timesCorrect === "number" &&
    typeof item.isMastered === "boolean" &&
    (item.lastSeenAt === null || typeof item.lastSeenAt === "string")
  );
}

export function sanitizeProgress(value: unknown): ProgressMap {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([cardId, item]) => isProgress(item) && item.cardId === cardId,
    ),
  );
}

export function loadProgress(storage: Storage = localStorage): ProgressMap {
  try {
    const serialized = storage.getItem(getStorageKey());
    return serialized ? sanitizeProgress(JSON.parse(serialized)) : {};
  } catch {
    return {};
  }
}

export function saveProgress(
  progress: ProgressMap,
  storage: Storage = localStorage,
): void {
  storage.setItem(getStorageKey(), JSON.stringify(progress));
}

export function clearProgress(storage: Storage = localStorage): void {
  storage.removeItem(getStorageKey());
}

export function exportProgress(progress: ProgressMap): ProgressExport {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    deploymentId: getDeploymentId(),
    progress,
  };
}

export function importProgress(serialized: string): ProgressMap {
  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("This file does not contain a progress export.");
  }

  const payload = parsed as Partial<ProgressExport>;
  if (payload.schemaVersion !== SCHEMA_VERSION || !payload.progress) {
    throw new Error("This progress file uses an unsupported format.");
  }
  return sanitizeProgress(payload.progress);
}
