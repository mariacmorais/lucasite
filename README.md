# ITE Review

A lightweight Anki-style study app generated from Paul's Anesthesiology ITE
notes. It is a static React/Vite site: there is no backend, login, analytics, or
frontend API key.

## Run locally

Requirements: Node.js 22.13+ (Node 24 recommended), pnpm 11+, and Python 3.10+.

```bash
pnpm install
pnpm dev
```

If you use npm instead: `npm install`, `npm run dev`, `npm test`, and
`npm run build` invoke the same project scripts. The checked-in deployment
workflow uses pnpm for reproducible installs.

Production checks:

```bash
pnpm test
pnpm build
pnpm preview
```

The deployable site is written to `dist/`.

## Generate the flashcards

1. Copy `Paul's ITE Review_Notes.pdf` to `content/`.
2. Install the local extraction dependency: `python3 -m pip install pdfplumber`.
3. Extract page-aware text:

   ```bash
   python3 scripts/extract_pdf_text.py
   ```

4. Generate the static deck:

   ```bash
   python3 scripts/generate_cards.py
   ```

The generator is deterministic, conservative, and fully offline. It detects the
PDF's 18 pt topic headings, turns clear label/value, cause/effect, contrast, and
quantitative notes into active-recall cards, and skips ambiguous prose. It never
calls an LLM.

Review `public/cards.json` before publishing. Each card can be edited or deleted
directly, and the app's **Card library** screen provides a readable preview.
Keep an existing card's `id` stable when editing it so saved progress still
applies.

The source document itself warns that the notes may contain errors. Generated
cards are study aids, not clinical guidance.

## Progress and scheduling

Every card records successful recalls, review debt, ratings, seen/correct counts,
mastery, and its most recent review time. A card is mastered after two **Knew it**
ratings and no remaining debt.

- **Knew it** adds a successful recall and pays down one unit of review debt.
- **Need to review** creates at least two repetitions.
- **Did not know it at all** creates at least three repetitions.
- High-debt cards are prioritized, without immediately repeating the same card
  when another active card is available.

Progress is saved in `localStorage`; refreshing the page preserves it.

## Deploy the same codebase more than once

No code change is required per deployment. The Vite build uses relative asset
paths, so the same `dist/` works at a custom-domain root or under a GitHub Pages
repository path.

The storage design handles both deployment shapes:

- Browsers isolate `localStorage` by origin, so `cards.alice.com` and
  `cards.bob.com` cannot see one another's progress.
- Two project sites such as `name.github.io/deck-a/` and
  `name.github.io/deck-b/` share an origin, so the app also includes its resolved
  deployment base path in the storage key.
- Browser profiles and devices have separate storage. There is no cross-device
  synchronization.

An optional `VITE_DEPLOYMENT_ID` can give a deployment an explicit stable
namespace. Use a distinct value for each deployment:

```bash
VITE_DEPLOYMENT_ID=paul-ite-alice VITE_SITE_NAME="Alice's ITE Review" pnpm build
```

Do not reuse a deployment ID for two apps served from the same origin. A domain
move still creates a new browser origin; export progress from the old site and
import it into the new site.

### GitHub Pages

The included `.github/workflows/deploy-pages.yml` tests, builds, and publishes
on every push to `main`.

For each repository that deploys this codebase:

1. In **Settings → Pages**, choose **GitHub Actions** as the source.
2. Optionally add repository variables under **Settings → Secrets and variables
   → Actions → Variables**:
   - `DEPLOYMENT_ID`: a unique stable identifier such as `ite-maria`.
   - `SITE_NAME`: the title shown in the header.
3. Push `main`, then wait for the Pages workflow.

To deploy for another friend, create another repository from the same code,
configure different repository variables, and enable Pages. No scheduler or
storage code should be forked.

For a manual deployment, upload the contents of `dist/` to the Pages publishing
branch or any static host.

### Custom domain

In the deployment repository's **Settings → Pages**, enter the custom domain and
configure the DNS records GitHub displays. Enable **Enforce HTTPS** after DNS is
valid. GitHub can manage the CNAME setting; alternatively, add a deployment-
specific `public/CNAME` containing the hostname before building.

Do not commit one shared `public/CNAME` when the same branch feeds several
domains. Configure the domain in each repository or inject its CNAME in that
repository's deployment workflow.

## Backup, restore, and limitations

Use **Export JSON** to download progress and **Import JSON** to restore it. This
is also the supported way to move progress to a new browser or domain.

`localStorage` is private to the current browser profile and origin, but it is
not an encrypted database. Clearing site data, private-browsing cleanup, browser
policies, or uninstalling the browser can delete it. Static GitHub Pages cannot
sync progress across devices or users; that would require authentication and a
backend.

## Project structure

```text
src/components/       Study UI
src/lib/scheduler.ts  Queue and mastery rules
src/lib/storage.ts    Deployment-scoped local persistence
public/cards.json     Generated static deck
scripts/              Offline PDF extraction and card generation
content/              Local source material (PDF ignored by git)
```
