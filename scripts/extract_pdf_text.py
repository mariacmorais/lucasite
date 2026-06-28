#!/usr/bin/env python3
"""Extract page-aware, layout-aware lines from Paul's ITE review PDF."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from statistics import median

import pdfplumber


DEFAULT_PDF = Path("content/Paul's ITE Review_Notes.pdf")
DEFAULT_OUTPUT = Path("content/extracted_pages.json")


def group_words(words: list[dict], tolerance: float = 2.5) -> list[list[dict]]:
    lines: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (float(item["top"]), float(item["x0"]))):
        top = float(word["top"])
        if not lines or abs(top - median(float(item["top"]) for item in lines[-1])) > tolerance:
            lines.append([word])
        else:
            lines[-1].append(word)
    return [sorted(line, key=lambda item: float(item["x0"])) for line in lines]


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract(pdf_path: Path) -> list[dict]:
    pages: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(
                extra_attrs=["size"],
                keep_blank_chars=False,
                use_text_flow=False,
            )
            page_lines: list[dict] = []
            for line_words in group_words(words):
                text = clean_text(" ".join(str(word["text"]) for word in line_words))
                if not text:
                    continue
                top = min(float(word["top"]) for word in line_words)
                bottom = max(float(word["bottom"]) for word in line_words)
                if top < 30 or bottom > float(page.height) - 25:
                    continue
                sizes = [float(word["size"]) for word in line_words]
                font_size = round(median(sizes), 1)
                # Topic headings use 18 pt type; the document title uses 20 pt.
                is_heading = 16.0 <= font_size < 20.0 and len(text) <= 120
                page_lines.append(
                    {
                        "text": text,
                        "x": round(min(float(word["x0"]) for word in line_words), 1),
                        "fontSize": font_size,
                        "heading": is_heading,
                    }
                )
            pages.append({"page": page_number, "lines": page_lines})
    return pages


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.pdf.exists():
        raise SystemExit(
            f"PDF not found: {args.pdf}\n"
            "Copy Paul's ITE Review_Notes.pdf into content/ or pass --pdf."
        )

    pages = extract(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(
            {
                "document": args.pdf.name,
                "pageCount": len(pages),
                "pages": pages,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    line_count = sum(len(page["lines"]) for page in pages)
    print(f"Extracted {line_count} lines from {len(pages)} pages to {args.output}")


if __name__ == "__main__":
    main()
