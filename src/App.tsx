import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flashcard } from "./components/Flashcard";
import { ProgressBar } from "./components/ProgressBar";
import { ReviewControls } from "./components/ReviewControls";
import { TopicSelector } from "./components/TopicSelector";
import {
  activeCards,
  chooseNextCard,
  filterCards,
  rateCard,
  summarize,
} from "./lib/scheduler";
import {
  clearProgress,
  exportProgress,
  getDeploymentId,
  importProgress,
  loadProgress,
  saveProgress,
} from "./lib/storage";
import type { Card, ProgressMap, Rating } from "./lib/types";

type View = "dashboard" | "review" | "admin";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [view, setView] = useState<View>("dashboard");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [currentCardId, setCurrentCardId] = useState<string>();
  const [isRevealed, setIsRevealed] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = new URL("cards.json", document.baseURI);
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load cards (${response.status})`);
        return response.json() as Promise<Card[]>;
      })
      .then(setCards)
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const scopedCards = useMemo(
    () => filterCards(cards, selectedTopic, query),
    [cards, query, selectedTopic],
  );
  const deckSummary = useMemo(() => summarize(cards, progress), [cards, progress]);
  const scopeSummary = useMemo(
    () => summarize(scopedCards, progress),
    [progress, scopedCards],
  );
  const currentCard = scopedCards.find((card) => card.id === currentCardId);
  const remaining = activeCards(scopedCards, progress).length;

  const startReview = useCallback(() => {
    const first = chooseNextCard(scopedCards, progress);
    setCurrentCardId(first?.id);
    setIsRevealed(false);
    setView("review");
  }, [progress, scopedCards]);

  const handleRating = useCallback(
    (rating: Rating) => {
      if (!currentCard || !isRevealed) return;
      const nextProgress = {
        ...progress,
        [currentCard.id]: rateCard(progress[currentCard.id], currentCard.id, rating),
      };
      setProgress(nextProgress);
      setCurrentCardId(
        chooseNextCard(scopedCards, nextProgress, currentCard.id)?.id,
      );
      setIsRevealed(false);
    },
    [currentCard, isRevealed, progress, scopedCards],
  );

  useEffect(() => {
    if (view !== "review") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setIsRevealed(true);
      }
      if (!isRevealed) return;
      if (event.key === "1") handleRating("knew-it");
      if (event.key === "2") handleRating("need-review");
      if (event.key === "3") handleRating("did-not-know");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRating, isRevealed, view]);

  function resetAllProgress() {
    if (!window.confirm("Reset all progress for this deployment? This cannot be undone.")) {
      return;
    }
    clearProgress();
    setProgress({});
    setNotice("Progress reset.");
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const imported = importProgress(await file.text());
      setProgress(imported);
      setNotice(`Imported progress for ${Object.keys(imported).length} cards.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import progress.");
    }
  }

  const siteName = import.meta.env.VITE_SITE_NAME?.trim() || "ITE Review";

  if (loadError) {
    return (
      <main className="centered-state">
        <p className="eyebrow">Deck unavailable</p>
        <h1>Cards could not be loaded.</h1>
        <p>{loadError}</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("dashboard")}>
          <span className="brand-mark">AR</span>
          <span>
            <strong>{siteName}</strong>
            <small>Anesthesiology board prep</small>
          </span>
        </button>
        <nav aria-label="Primary navigation">
          <button
            className={view === "dashboard" ? "is-active" : ""}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={view === "admin" ? "is-active" : ""}
            onClick={() => setView("admin")}
          >
            Card library
          </button>
        </nav>
        <button className="button button--small" onClick={startReview}>
          Start review
        </button>
      </header>

      {notice && (
        <button className="notice" onClick={() => setNotice("")}>
          {notice} <span aria-hidden="true">×</span>
        </button>
      )}

      {view === "dashboard" && (
        <main>
          <section className="hero">
            <div className="hero__copy">
              <p className="eyebrow">Today’s study session</p>
              <h1>Build durable recall,<br />one card at a time.</h1>
              <p className="hero__lede">
                A focused review deck built from Paul’s Anesthesiology ITE notes.
                Your study history stays in this browser.
              </p>
              <div className="hero__actions">
                <button className="button button--primary" onClick={startReview}>
                  Review {selectedTopic ?? "all topics"} <span>→</span>
                </button>
                {selectedTopic && (
                  <button className="button" onClick={() => setSelectedTopic(null)}>
                    Clear topic
                  </button>
                )}
              </div>
            </div>
            <div className="mastery-card">
              <div className="mastery-ring" style={{ "--value": deckSummary.percent } as React.CSSProperties}>
                <div>
                  <strong>{deckSummary.percent}%</strong>
                  <span>mastered</span>
                </div>
              </div>
              <div>
                <p className="eyebrow">Overall progress</p>
                <h2>{deckSummary.mastered} of {deckSummary.total} cards</h2>
                <p>{deckSummary.total - deckSummary.mastered} active cards remain.</p>
              </div>
            </div>
          </section>

          <section className="dashboard-body">
            <div className="stat-grid" aria-label="Progress summary">
              <div className="stat-card stat-card--accent">
                <span>Mastered</span><strong>{deckSummary.mastered}</strong>
                <small>Two successful recalls</small>
              </div>
              <div className="stat-card">
                <span>Needs review</span><strong>{deckSummary.needsReview}</strong>
                <small>Priority repetitions due</small>
              </div>
              <div className="stat-card">
                <span>Not yet seen</span><strong>{deckSummary.unseen}</strong>
                <small>Fresh cards waiting</small>
              </div>
              <div className="stat-card">
                <span>Total cards</span><strong>{deckSummary.total}</strong>
                <small>Across the complete deck</small>
              </div>
            </div>

            <div className="search-panel">
              <label htmlFor="card-search">Search the deck</label>
              <div className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  id="card-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “airway”, “propofol”, or “hypoxemia”"
                />
                {query && <span className="result-count">{scopedCards.length} cards</span>}
              </div>
            </div>

            <TopicSelector
              cards={cards}
              progress={progress}
              selectedTopic={selectedTopic}
              onSelect={setSelectedTopic}
            />

            <section className="data-panel">
              <div>
                <p className="eyebrow">Local data</p>
                <h2>Your progress belongs to this site and browser.</h2>
                <p>
                  Export a backup before changing domains or moving to another device.
                </p>
                <code>{getDeploymentId()}</code>
              </div>
              <div className="data-actions">
                <button
                  className="button"
                  onClick={() => downloadJson("ite-progress.json", exportProgress(progress))}
                >
                  Export JSON
                </button>
                <button className="button" onClick={() => importInput.current?.click()}>
                  Import JSON
                </button>
                <button className="button button--danger" onClick={resetAllProgress}>
                  Reset
                </button>
                <input
                  ref={importInput}
                  className="visually-hidden"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => handleImport(event.target.files?.[0])}
                />
              </div>
            </section>
          </section>
        </main>
      )}

      {view === "review" && (
        <main className="review-page">
          <div className="review-header">
            <button className="back-button" onClick={() => setView("dashboard")}>
              ← Dashboard
            </button>
            <div>
              <span>{selectedTopic ?? "All topics"}</span>
              <ProgressBar
                value={scopeSummary.percent}
                label="Session mastery"
                compact
              />
            </div>
          </div>
          {currentCard ? (
            <>
              <Flashcard
                card={currentCard}
                isRevealed={isRevealed}
                onReveal={() => setIsRevealed(true)}
                position={scopeSummary.mastered + 1}
                remaining={remaining}
              />
              {isRevealed ? (
                <ReviewControls onRate={handleRating} />
              ) : (
                <p className="shortcut-hint">Think of your answer before revealing the card.</p>
              )}
            </>
          ) : (
            <section className="completion-card">
              <span className="completion-icon">✓</span>
              <p className="eyebrow">Session complete</p>
              <h1>You’ve mastered this set.</h1>
              <p>
                {scopeSummary.mastered} of {scopeSummary.total} cards are complete.
              </p>
              <button className="button button--primary" onClick={() => setView("dashboard")}>
                Return to dashboard
              </button>
            </section>
          )}
        </main>
      )}

      {view === "admin" && (
        <main className="library-page">
          <div className="library-heading">
            <div>
              <p className="eyebrow">Admin preview</p>
              <h1>Card library</h1>
              <p>Review generated cards before publishing. Edit or remove cards in <code>public/cards.json</code>.</p>
            </div>
            <div className="search-field search-field--small">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter cards"
                aria-label="Filter cards"
              />
            </div>
          </div>
          <div className="library-list">
            {filterCards(cards, null, query).map((card, index) => (
              <article className="library-card" key={card.id}>
                <div className="library-card__number">{String(index + 1).padStart(3, "0")}</div>
                <div>
                  <span className="topic-pill">{card.topic}</span>
                  <h2>{card.front}</h2>
                  <p>{card.back}</p>
                  <small>Page {card.source.page} · {card.id}</small>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      <footer>
        <span>Private by design · No account required</span>
        <span>Progress is stored only in this browser</span>
      </footer>
    </div>
  );
}
