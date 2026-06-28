import type { Card, ProgressMap } from "../lib/types";
import { summarize } from "../lib/scheduler";
import { ProgressBar } from "./ProgressBar";

interface TopicSelectorProps {
  cards: Card[];
  progress: ProgressMap;
  selectedTopic: string | null;
  onSelect: (topic: string | null) => void;
}

export function TopicSelector({
  cards,
  progress,
  selectedTopic,
  onSelect,
}: TopicSelectorProps) {
  const topics = [...new Set(cards.map((card) => card.topic))].sort();

  return (
    <section className="topic-section" aria-labelledby="topics-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Study by subject</p>
          <h2 id="topics-heading">Topics</h2>
        </div>
        <span className="quiet">{topics.length} topics</span>
      </div>
      <div className="topic-grid">
        <button
          className={`topic-card ${selectedTopic === null ? "is-selected" : ""}`}
          onClick={() => onSelect(null)}
        >
          <span className="topic-icon">ALL</span>
          <span className="topic-card__body">
            <strong>All topics</strong>
            <small>{cards.length} cards</small>
            <ProgressBar
              value={summarize(cards, progress).percent}
              label="All topics"
              compact
            />
          </span>
        </button>
        {topics.map((topic, index) => {
          const topicCards = cards.filter((card) => card.topic === topic);
          const summary = summarize(topicCards, progress);
          return (
            <button
              className={`topic-card ${selectedTopic === topic ? "is-selected" : ""}`}
              onClick={() => onSelect(topic)}
              key={topic}
            >
              <span className="topic-icon">{String(index + 1).padStart(2, "0")}</span>
              <span className="topic-card__body">
                <strong>{topic}</strong>
                <small>{topicCards.length} cards</small>
                <ProgressBar
                  value={summary.percent}
                  label={`${topic} mastery`}
                  compact
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
