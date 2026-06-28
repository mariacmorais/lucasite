#!/usr/bin/env python3
"""Generate conservative, deterministic flashcards from extracted note lines.

This script intentionally skips ambiguous prose. It does not call an LLM or any
network service, so no API key is required and no clinical facts are invented.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


DEFAULT_INPUT = Path("content/extracted_pages.json")
DEFAULT_OUTPUT = Path("public/cards.json")
BULLET_RE = re.compile(r"^(?:[●○■▪•◦\-]|(?:\d+|[A-Za-z])[\.)])\s*")
SOURCE_RE = re.compile(r"^(?:source|references?|access the latest)", re.I)
HEADER_RE = re.compile(r"^PAUL[’']S ANESTHESIOLOGY ITE REVIEW\b", re.I)
MANUAL_CARDS = [
    {
        "topic": "Succinylcholine-induced Myalgia and Fasciculation",
        "front": "What medications can prevent succinylcholine-induced myalgia?",
        "back": (
            "NSAIDs (most effective), high-dose succinylcholine (1.5 mg/kg), "
            "lidocaine (1.5 mg/kg), and a defasciculating dose of rocuronium "
            "(0.03 mg/kg)."
        ),
        "page": 1,
    },
    {
        "topic": "Methemoglobinemia",
        "front": "What happens to SpO2 readings in methemoglobinemia?",
        "back": "Pulse oximetry tends to read around 85% regardless of the true SaO2.",
        "page": 3,
    },
]


def normalize(text: str) -> str:
    text = BULLET_RE.sub("", text.strip())
    return re.sub(r"\s+", " ", text).strip(" ;")


def is_usable(text: str) -> bool:
    lowered = text.lower()
    return (
        4 <= len(text) <= 420
        and not SOURCE_RE.match(text)
        and not HEADER_RE.match(text)
        and "bit.ly/" not in lowered
        and not re.fullmatch(r"\d+", text)
    )


def stable_id(topic: str, page: int, front: str, back: str) -> str:
    key = f"{topic}|{page}|{front}|{back}".encode("utf-8")
    return f"ite-{hashlib.sha1(key).hexdigest()[:12]}"


def topic_tags(topic: str) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z-]{3,}", topic.lower())
    stop = {"with", "from", "that", "this", "clinical", "general"}
    tags = ["ITE", "anesthesiology"]
    tags.extend(word for word in words if word not in stop)
    return list(dict.fromkeys(tags))[:6]


def clean_answer(text: str) -> str:
    text = text.strip()
    if not text:
        return text
    return text[0].upper() + text[1:]


def card_from_line(
    topic: str,
    text: str,
    page: int,
    parent: str | None,
) -> tuple[str, str] | None:
    text = normalize(text)
    if not is_usable(text):
        return None

    # Document-specific high-value structures produce direct active-recall cards.
    if topic == "Clinical Signs of General Anesthesia":
        phase = re.match(r"Phase\s+([123])\s*:\s*(.+)", text, re.I)
        if phase:
            return (
                f"During emergence from general anesthesia, what marks Phase {phase.group(1)}?",
                clean_answer(phase.group(2)),
            )

    if "→" in text:
        left, right = (part.strip() for part in text.split("→", 1))
        if left and right and len(left) <= 180:
            if re.match(r"^(?:state|phase|presentation|timing|prevention)", left, re.I):
                front = f"In {topic}, what is associated with {left.lower()}?"
            else:
                front = f"In {topic}, what does {left} indicate or lead to?"
            return front, clean_answer(right)

    if ":" in text:
        label, answer = (part.strip() for part in text.split(":", 1))
        if not answer or len(label) > 150:
            return None
        context = normalize(parent or topic)
        label_lower = label.lower()
        if label_lower == "timing":
            front = f"What is the recommended timing for {context}?"
        elif label_lower in {"dose", "dosage"}:
            front = f"What dose is noted for {context}?"
        elif label_lower in {"presentation", "symptoms", "signs"}:
            front = f"How does {context} present?"
        elif label_lower in {"prevention", "treatment", "management"}:
            front = f"How is {context} {label_lower} handled?"
        elif label_lower in {"adverse effects", "complications", "risk factors"}:
            front = f"What are the {label_lower} of {context}?"
        elif label_lower == "mechanism":
            front = f"What is the mechanism of {context}?"
        elif re.search(r"\b(?:incidence|half-life|duration|onset|mac|dose)\b", label_lower):
            front = f"What is the {label_lower} in {topic}?"
        else:
            front = f"In {topic}, what should be recalled about {label}?"
        return front, clean_answer(answer)

    contrast = re.match(r"(.{5,160}?),?\s+but\s+(.+)", text, re.I)
    if contrast:
        return (
            f"In {topic}, what distinction applies to {contrast.group(1)}?",
            clean_answer(contrast.group(2)),
        )

    # Preserve concise quantitative facts while skipping broad narrative notes.
    if re.search(r"\d", text) and len(text) <= 220:
        masked = re.sub(
            r"(?<![A-Za-z])\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?(?:\s*%)?",
            "___",
            text,
        )
        return (
            f"In {topic}, what value(s) complete this note: “{masked}”?",
            clean_answer(text),
        )
    return None


def iter_units(payload: dict):
    """Join visual line wraps before creating cards.

    A new bullet/number or topic heading starts a unit. Other lines are layout
    continuations and belong to the previous unit. Page boundaries are retained
    so source references remain accurate.
    """
    topic: str | None = None
    parts: list[str] = []
    unit_page = 0

    def flush():
        nonlocal parts
        if topic and parts:
            text = " ".join(parts)
            parts = []
            return topic, unit_page, text
        parts = []
        return None

    for page in payload["pages"]:
        page_number = int(page["page"])
        for line in page["lines"]:
            raw_text = line["text"].strip()
            if not raw_text or float(line.get("fontSize", 10)) < 8:
                continue
            if line.get("heading"):
                pending = flush()
                if pending:
                    yield pending
                topic = re.sub(r"^\d+\s+(?=[A-Z])", "", normalize(raw_text))
                unit_page = page_number
                continue
            if not topic or HEADER_RE.match(raw_text):
                continue

            starts_unit = bool(BULLET_RE.match(raw_text))
            if starts_unit:
                pending = flush()
                if pending:
                    yield pending
                unit_page = page_number
                parts = [raw_text]
            elif parts:
                parts.append(raw_text)
            else:
                unit_page = page_number
                parts = [raw_text]

        pending = flush()
        if pending:
            yield pending


def generate(payload: dict) -> list[dict]:
    document = payload.get("document", "Paul's ITE Review_Notes.pdf")
    cards: list[dict] = []
    seen_pairs: set[tuple[str, str]] = set()
    parent: str | None = None

    for manual in MANUAL_CARDS:
        pair = (manual["front"], manual["back"])
        seen_pairs.add(pair)
        cards.append(
            {
                "id": stable_id(
                    manual["topic"], manual["page"], manual["front"], manual["back"]
                ),
                "topic": manual["topic"],
                "front": manual["front"],
                "back": manual["back"],
                "source": {"document": document, "page": manual["page"]},
                "tags": topic_tags(manual["topic"]),
            }
        )

    previous_topic: str | None = None
    for topic, page_number, raw_text in iter_units(payload):
        if topic != previous_topic:
            parent = None
            previous_topic = topic
        if SOURCE_RE.match(normalize(raw_text)):
            continue

        starts_group = bool(re.match(r"^(?:●|\d+[\.)])", raw_text))
        starts_child = bool(re.match(r"^(?:○|■|▪|•|◦)", raw_text))
        normalized = normalize(raw_text)
        if starts_group:
            parent = normalized

        pair = card_from_line(topic, raw_text, page_number, parent if starts_child else None)
        if not pair or pair in seen_pairs:
            continue
        front, back = pair
        if front.casefold() == back.casefold():
            continue
        seen_pairs.add(pair)
        cards.append(
            {
                "id": stable_id(topic, page_number, front, back),
                "topic": topic,
                "front": front,
                "back": back,
                "source": {"document": document, "page": page_number},
                "tags": topic_tags(topic),
            }
        )

    return cards


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(
            f"Extracted text not found: {args.input}\n"
            "Run scripts/extract_pdf_text.py first."
        )

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    cards = generate(payload)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    topics = len({card["topic"] for card in cards})
    print(f"Generated {len(cards)} cards across {topics} topics at {args.output}")


if __name__ == "__main__":
    main()
