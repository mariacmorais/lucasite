# Source content

Place the source document here as:

`Paul's ITE Review_Notes.pdf`

The PDF is intentionally not committed by default. From the project root, run:

```bash
python3 scripts/extract_pdf_text.py
python3 scripts/generate_cards.py
```

Both scripts are deterministic and offline. Review `public/cards.json` before
publishing because the source notes may contain errors and rule-based generation
can produce weak cards.
