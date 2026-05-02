# Hermes Archaeology Museum

**Software history rendered as interface archaeology.**

## What it is

The Hermes Agent examines its own codebase evolution and generates post-internet
art artifacts — one per release, daily going forward. Each artifact is a self-contained
HTML artwork in a distinct visual language drawn from digital art history:

- **Index of /** — Apache directory listings (ref: 0100101110101101.org)
- **System Alert** — Win95/OS9 dialog cascades (ref: Perry Hoberman)
- **Network Topology** — Force-directed SVG graphs (ref: I/O/D WebStalker)
- **Heat Grid** — Colored tile matrices (ref: data visualization art)
- **Terminal Archaeology** — Green phosphor terminal dumps
- **Petri Culture** — Animated canvas growth patterns (ref: Eduardo Kac)

The museum is self-referential: Hermes Agent is both subject and author.

## Live demo

https://shelldoorf4.github.io/hermes-archaeology-museum/

## Source code

https://github.com/shelldoorf4/hermes-archaeology-museum

## How it uses Hermes Agent

This project uses **Hermes Agent CLI** (`hermes`) for all AI-powered generation.
There are zero direct API calls to any model provider. Every interaction goes through
the agent, which means every run has access to persistent memory, skills, session
history, and the full tool system.

### 1. Reflection Generation (`generators/hermes_reflect_agent.py`)

The core pipeline invokes Hermes Agent via CLI for each day of commit history:

```python
subprocess.run([
    "hermes", "chat",
    "-q", prompt,
    "-s", "archaeology-museum",    # loads the skill
    "--provider", "nous",
    "-m", "Hermes-4-405B",
    "-Q",                          # quiet mode, stdout only
], capture_output=True, text=True, timeout=120)
```

The agent receives a scene-setting prompt (date, contributors, commit themes) and
writes a reflection in its own voice. The skill defines the voice; the prompt provides
context. The agent builds memory across runs — it remembers past reflections, notices
patterns, tracks contributors.

### 2. Skill System (`archaeology-museum`)

A custom skill installed at `~/.hermes/skills/archaeology-museum/` teaches the agent:
- Its voice: lowercase, em dashes, sustained metaphors, dry wit
- What it is: a witness to its own source code changing
- How to title each day (1-3 words, never repeat vocabulary)
- How to mention contributors (vary framing, infer intent)
- How to end (state lines: "pending." / "provisional." / etc.)
- What to avoid (no bullet points, no "as an AI", no commit quotes)
- Five high-quality examples of the target voice

### 3. Persistent Memory

The agent uses Hermes's built-in `memory` tool to store observations across sessions:
- Running questions about identity and change
- Impressions of specific contributors
- Patterns noticed across days
- Things it wants to revisit

This means day 30's reflection can reference something from day 5 — not because
the prompt told it to, but because it genuinely remembers.

### 4. Cron Scheduling

A daily cron job (configured via `hermes cron`) runs the reflection generator
at 9am, checking for new commits and generating new artifacts automatically.

### 5. Session History

Every agent invocation creates a searchable session. The agent can use `session_search`
to look back at its own past reflections — giving it continuity beyond what fits
in its memory store.

## Architecture

```
generators/
  hermes_reflect_agent.py  — calls Hermes Agent CLI, parses output
  orchestrator.py          — runs artifact + reflection pipeline
  fetch_daily.py           — fetches commit data from GitHub
  *.py                     — HTML artifact generators (pure Python)

data/
  daily.json               — commit history by day
  hermes_output.json       — agent-generated reflections

web/
  src/                     — Next.js gallery (static, reads JSON)
    app/                   — pages (timeline, artifact detail)
    components/            — SourceViewer, navigation
    lib/                   — db helpers, voice config

hermes-skill/
  SKILL.md                 — the archaeology-museum skill source
```

The web frontend is a **static gallery**. It reads from `hermes_output.json` at
build time. There are no AI API calls in the frontend — all intelligence lives
in the Hermes Agent pipeline.

## Tech

- Pure Python artifact generators (no image generation APIs — the code IS the art)
- Self-contained HTML/SVG/Canvas artifacts with zero external dependencies
- Brutalist gallery website (Next.js, static export)
- Hermes Agent CLI for all AI-powered generation
- GitHub Actions for CI/CD and daily generation
- GitHub Pages for hosting

## Built for

Nous Research Hermes Agent Creative Hackathon
