import { describe, expect, it } from "vitest";
import {
  chooseNextCard,
  filterCards,
  rateCard,
  summarize,
} from "./scheduler";
import type { Card, ProgressMap } from "./types";

const cards: Card[] = [
  {
    id: "a",
    topic: "Airway",
    front: "Question A",
    back: "Answer A",
    source: { document: "notes.pdf", page: 1 },
    tags: ["airway"],
  },
  {
    id: "b",
    topic: "Pharmacology",
    front: "What does propofol do?",
    back: "Answer B",
    source: { document: "notes.pdf", page: 2 },
    tags: ["drug"],
  },
];

describe("rateCard", () => {
  it("masters a card after two knew-it ratings", () => {
    const first = rateCard(undefined, "a", "knew-it");
    expect(first.isMastered).toBe(false);
    expect(first.knewCount).toBe(1);

    const second = rateCard(first, "a", "knew-it");
    expect(second.isMastered).toBe(true);
    expect(second.knewCount).toBe(2);
  });

  it("requires two debt-clearing repetitions after need-review", () => {
    const failed = rateCard(undefined, "a", "need-review");
    expect(failed.reviewDebt).toBe(2);

    const repeatOne = rateCard(failed, "a", "knew-it");
    expect(repeatOne.reviewDebt).toBe(1);
    expect(repeatOne.isMastered).toBe(false);

    const repeatTwo = rateCard(repeatOne, "a", "knew-it");
    expect(repeatTwo.reviewDebt).toBe(0);
    expect(repeatTwo.isMastered).toBe(true);
  });

  it("requires three debt-clearing repetitions after did-not-know", () => {
    let progress = rateCard(undefined, "a", "did-not-know");
    expect(progress.reviewDebt).toBe(3);
    progress = rateCard(progress, "a", "knew-it");
    progress = rateCard(progress, "a", "knew-it");
    expect(progress.isMastered).toBe(false);
    progress = rateCard(progress, "a", "knew-it");
    expect(progress.reviewDebt).toBe(0);
    expect(progress.isMastered).toBe(true);
  });
});

describe("queue and filtering", () => {
  it("prioritizes review debt without repeating the prior card", () => {
    const progress: ProgressMap = {
      a: rateCard(undefined, "a", "did-not-know"),
    };
    expect(chooseNextCard(cards, progress)?.id).toBe("a");
    expect(chooseNextCard(cards, progress, "a")?.id).toBe("b");
  });

  it("filters by topic and keyword", () => {
    expect(filterCards(cards, "Airway")).toEqual([cards[0]]);
    expect(filterCards(cards, null, "PROPOFOL")).toEqual([cards[1]]);
  });

  it("summarizes deck progress", () => {
    const mastered = rateCard(
      rateCard(undefined, "a", "knew-it"),
      "a",
      "knew-it",
    );
    expect(summarize(cards, { a: mastered })).toEqual({
      total: 2,
      mastered: 1,
      needsReview: 0,
      unseen: 1,
      percent: 50,
    });
  });
});
