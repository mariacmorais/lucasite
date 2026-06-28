import type { Rating } from "../lib/types";

interface ReviewControlsProps {
  onRate: (rating: Rating) => void;
}

export function ReviewControls({ onRate }: ReviewControlsProps) {
  return (
    <div className="review-controls" aria-label="Rate this card">
      <button
        className="rating-button rating-button--know"
        onClick={() => onRate("knew-it")}
      >
        <span className="rating-key">1</span>
        <span>
          <strong>Knew it</strong>
          <small>Build mastery</small>
        </span>
      </button>
      <button
        className="rating-button rating-button--review"
        onClick={() => onRate("need-review")}
      >
        <span className="rating-key">2</span>
        <span>
          <strong>Need to review</strong>
          <small>Repeat at least twice</small>
        </span>
      </button>
      <button
        className="rating-button rating-button--again"
        onClick={() => onRate("did-not-know")}
      >
        <span className="rating-key">3</span>
        <span>
          <strong>Did not know</strong>
          <small>Repeat at least three times</small>
        </span>
      </button>
    </div>
  );
}
