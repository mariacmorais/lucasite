import type {
  Card,
  CardProgress,
  ProgressMap,
  ProgressSummary,
  Rating,
} from "./types";

export function createProgress(cardId: string): CardProgress {
  return {
    cardId,
    knewCount: 0,
    reviewDebt: 0,
    lastRating: null,
    timesSeen: 0,
    timesCorrect: 0,
    isMastered: false,
    lastSeenAt: null,
  };
}

export function rateCard(
  current: CardProgress | undefined,
  cardId: string,
  rating: Rating,
  now = new Date().toISOString(),
): CardProgress {
  const next = { ...(current ?? createProgress(cardId)) };
  next.timesSeen += 1;
  next.lastSeenAt = now;
  next.lastRating = rating;

  if (rating === "knew-it") {
    next.knewCount = Math.min(2, next.knewCount + 1);
    next.timesCorrect += 1;
    next.reviewDebt = Math.max(0, next.reviewDebt - 1);
  } else if (rating === "need-review") {
    next.reviewDebt = Math.max(2, next.reviewDebt);
  } else {
    next.reviewDebt = Math.max(3, next.reviewDebt);
  }

  next.isMastered = next.knewCount >= 2 && next.reviewDebt === 0;
  return next;
}

function priority(card: Card, progress: ProgressMap): number {
  const item = progress[card.id];
  if (!item) return 1_000;
  return item.reviewDebt * 10_000 - item.knewCount * 100 - item.timesSeen;
}

export function activeCards(cards: Card[], progress: ProgressMap): Card[] {
  return cards
    .filter((card) => !progress[card.id]?.isMastered)
    .sort((a, b) => {
      const difference = priority(b, progress) - priority(a, progress);
      return difference || a.id.localeCompare(b.id);
    });
}

export function chooseNextCard(
  cards: Card[],
  progress: ProgressMap,
  previousCardId?: string,
): Card | undefined {
  const active = activeCards(cards, progress);
  if (active.length < 2) return active[0];
  return active.find((card) => card.id !== previousCardId) ?? active[0];
}

export function summarize(cards: Card[], progress: ProgressMap): ProgressSummary {
  const mastered = cards.filter((card) => progress[card.id]?.isMastered).length;
  const needsReview = cards.filter(
    (card) => (progress[card.id]?.reviewDebt ?? 0) > 0,
  ).length;
  const unseen = cards.filter(
    (card) => (progress[card.id]?.timesSeen ?? 0) === 0,
  ).length;

  return {
    total: cards.length,
    mastered,
    needsReview,
    unseen,
    percent: cards.length === 0 ? 0 : Math.round((mastered / cards.length) * 100),
  };
}

export function filterCards(
  cards: Card[],
  topic: string | null,
  query = "",
): Card[] {
  const needle = query.trim().toLocaleLowerCase();
  return cards.filter((card) => {
    const matchesTopic = !topic || card.topic === topic;
    const matchesQuery =
      !needle ||
      [card.front, card.back, card.topic, ...card.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle);
    return matchesTopic && matchesQuery;
  });
}
