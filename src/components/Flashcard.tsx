import type { Card } from "../lib/types";

interface FlashcardProps {
  card: Card;
  isRevealed: boolean;
  onReveal: () => void;
  position: number;
  remaining: number;
}

export function Flashcard({
  card,
  isRevealed,
  onReveal,
  position,
  remaining,
}: FlashcardProps) {
  return (
    <article className={`flashcard ${isRevealed ? "is-revealed" : ""}`}>
      <div className="flashcard__meta">
        <span className="topic-pill">{card.topic}</span>
        <span>
          Card {position} · {remaining} active
        </span>
      </div>

      <div className="flashcard__content">
        <p className="eyebrow">{isRevealed ? "Answer" : "Question"}</p>
        <h2>{isRevealed ? card.back : card.front}</h2>
      </div>

      {!isRevealed ? (
        <button className="button button--primary reveal-button" onClick={onReveal}>
          Show answer <kbd>Space</kbd>
        </button>
      ) : (
        <div className="source-line">
          <span>
            Source: {card.source.document}, page {card.source.page}
          </span>
          <span>{card.tags.slice(0, 3).join(" · ")}</span>
        </div>
      )}
    </article>
  );
}
