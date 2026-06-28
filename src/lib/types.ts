export type Rating = "knew-it" | "need-review" | "did-not-know";

export interface Card {
  id: string;
  topic: string;
  front: string;
  back: string;
  source: {
    document: string;
    page: number;
  };
  tags: string[];
}

export interface CardProgress {
  cardId: string;
  knewCount: number;
  reviewDebt: number;
  lastRating: Rating | null;
  timesSeen: number;
  timesCorrect: number;
  isMastered: boolean;
  lastSeenAt: string | null;
}

export type ProgressMap = Record<string, CardProgress>;

export interface ProgressExport {
  schemaVersion: 1;
  exportedAt: string;
  deploymentId: string;
  progress: ProgressMap;
}

export interface ProgressSummary {
  total: number;
  mastered: number;
  needsReview: number;
  unseen: number;
  percent: number;
}
