# 🃏 MimoCard

> **AI Flashcard Generator — paste any URL or notes, study spaced-repetition cards.**
> Powered by Xiaomi MiMo V2.5 via Pollinations · Jina AI reader · SM-2 scheduler · Anki export · Single HTML

🔗 **[Live demo](https://gyoomei.github.io/mimocard/)** · 📂 [Repo](https://github.com/gyoomei/mimocard)

---

## What it does

MimoCard turns any web article, tutorial, lecture notes, or book chapter into a fully-scheduled flashcard deck you actually study:

```
You paste:
  url:    https://en.wikipedia.org/wiki/Spaced_repetition
  count:  10 cards
  style:  Q&A

MimoCard returns:
  • 10 high-quality flashcards covering testable concepts
  • Each card scored with SM-2 spaced repetition scheduler
  • Saved locally (zero cloud, your decks stay on your device)
  • Anki-compatible TXT export for power users
  • Study mode with Again/Hard/Good/Easy grading + interval previews
  • Progress, accuracy, due-card counter, multi-deck "study all due" mode
```

Built as one self-contained HTML page. No backend. No API key. No signup.

## Features

| Capability | Detail |
|---|---|
| **Content extraction** | Jina AI reader (`r.jina.ai`) — turns any URL into clean markdown with no scraping or CORS workaround needed |
| **Card generation** | MiMo V2.5 via Pollinations — produces JSON-structured Q&A, cloze, or definition cards with anti-Bahasa-Melayu safety net for ID mode |
| **Scheduling** | Full SuperMemo-2 algorithm — ease factor, interval growth, lapse handling, 4-grade rating (Again / Hard / Good / Easy) |
| **Study UI** | Modal with progress bar, accuracy counter, keyboard shortcuts (Space to flip, 1-4 to grade), multi-deck "study all due" |
| **Storage** | localStorage — your decks never leave your browser, no account, no telemetry |
| **Export** | Anki-compatible TXT (tab-separated front/back, deck-name comment) |
| **Interface** | Bilingual EN/ID, dark/light theme, mobile responsive |

## How it works

```
┌──────────────────┐
│ User input       │  URL or pasted text + count + style
└─────────┬────────┘
          │
   ┌──────▼──────┐  Agent 1 — Fetcher
   │ r.jina.ai   │  → clean markdown content
   └──────┬──────┘
          │
   ┌──────▼──────┐  Agent 2 — Concept distiller
   │ MiMo V2.5   │  → identify key testable ideas
   └──────┬──────┘
          │
   ┌──────▼──────┐  Agent 3 — Card writer
   │ MiMo V2.5   │  → structured Q&A JSON, EN/ID
   └──────┬──────┘
          │
   ┌──────▼──────┐  Agent 4 — Scheduler
   │ SM-2 init   │  → ease factor + interval seeded
   └──────┬──────┘
          │
   ┌──────▼──────┐  Agent 5 — Library
   │ localStorage│  → deck saved + render UI
   └─────────────┘
```

## Try these

| URL | Why it shines |
|---|---|
| `https://en.wikipedia.org/wiki/Spaced_repetition` | Meta-perfect — study spaced-repetition with spaced repetition |
| `https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)` | Dense technical content, great for testing concept distillation |
| `https://en.wikipedia.org/wiki/Photosynthesis` | Bio textbook material, good fit for definition cards |
| Any tutorial / blog post | Paste URL, get cards, study tomorrow |

You can also switch to **From text** tab and paste lecture notes, ebook chapters, or anything else.

## SM-2 algorithm

The SuperMemo-2 algorithm is the OG spaced-repetition scheduler (the same one Anki was originally based on). MimoCard implements the full cycle:

```
Grade 0 (Again) → reps reset, EF -0.2, due in 10 min
Grade 3 (Hard)  → EF tweaked down, interval × EF
Grade 4 (Good)  → EF unchanged, interval × EF
Grade 5 (Easy)  → EF +0.13, interval × EF

reps 0  → first interval = 1 day
reps 1  → second interval = 6 days
reps 2+ → interval = previous × EF (ease factor)
```

EF (ease factor) starts at 2.5 and adjusts ±based on grades, with a 1.3 floor. After 5-6 successful reviews on a stable card, you might see it again 6 weeks → 3 months → 9 months out — exactly when you're about to forget it.

## Stack

- **Frontend:** Vanilla HTML + CSS + JS (no build step, no framework)
- **Content extraction:** [Jina AI Reader](https://r.jina.ai)
- **AI:** [Xiaomi MiMo V2.5](https://www.xiaomimimo.com/) via [Pollinations.ai](https://pollinations.ai) gateway
- **Scheduling:** SuperMemo-2 algorithm (in-app implementation)
- **Storage:** Browser localStorage
- **Hosting:** GitHub Pages

## Architecture decisions

- **Single HTML, zero dependencies** — bullet-proof against deploy issues, no `npm install`, browser opens it directly.
- **r.jina.ai over Readability.js** — Jina returns clean markdown directly with built-in CORS, no parsing overhead, no DOMParser pitfalls.
- **JSON output enforcement in prompt** — explicit structure rules + fallback parser that extracts `[...]` blocks, so card generation works even when MiMo wraps output in prose.
- **Anti-Melayu regex** — Pollinations gpt-oss-20b drifts into Bahasa Melayu when prompted in Indonesian. Word-boundary regex cleans drift before render.
- **localStorage over cloud** — your decks are private, no account, no telemetry. Trade-off: no cross-device sync, but Anki export gives a portable backup.
- **SM-2 over FSRS** — SM-2 is well-understood, deterministic, easy to debug, and Anki-compatible. FSRS would mean a heavier ML model in the browser for marginal gain on small decks.

## Run locally

```bash
git clone https://github.com/gyoomei/mimocard.git
cd mimocard
python3 -m http.server 8080
# open http://localhost:8080
```

## Roadmap

- [ ] Per-card edit (rewrite front/back manually)
- [ ] Tag system + filter studying by tag
- [ ] Stats dashboard: retention curve, daily review heatmap
- [ ] PDF / .docx upload via PDF.js + mammoth.js
- [ ] Optional FSRS scheduler

## License

MIT.

Built with 🔥 by [@gyoomei](https://github.com/gyoomei) · Submitted to **Xiaomi MiMo Orbit 100T Token Creator Program**.
