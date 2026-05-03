# Cursor Prompt — Build the "Subvocal" Internal Monologue System

## Concept

Add an internal monologue feature called "subvocal" — Hermes reacting to individual commits in real-time, 1-2 sentence micro-thoughts. These are raw, unfiltered reactions (unlike the polished daily reflections). Think: catching someone muttering to themselves while reading diffs.

This involves 3 pieces:
1. A new DB table + data file for subvocal thoughts  
2. A python generator script that processes existing commits from `data/daily.json`
3. A new `/monologue` page + nav link

---

## Part 1: Schema + DB Layer

### `web/db/schema.sql` — Add new table at the bottom:

```sql
CREATE TABLE IF NOT EXISTS subvocals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sha TEXT NOT NULL,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  commit_message TEXT NOT NULL DEFAULT '',
  thought TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subvocals_date ON subvocals(date);
```

### `web/src/lib/db.ts` — Add interface + query functions:

Add this interface after the existing ones:

```typescript
export interface Subvocal {
  id: number;
  sha: string;
  date: string;
  timestamp: string;
  author: string;
  commit_message: string;
  thought: string;
}
```

Add these query functions at the bottom:

```typescript
export function getAllSubvocals(): Subvocal[] {
  return getDb()
    .prepare("SELECT * FROM subvocals ORDER BY date ASC, timestamp ASC")
    .all() as Subvocal[];
}

export function getSubvocalsByDate(date: string): Subvocal[] {
  return getDb()
    .prepare("SELECT * FROM subvocals WHERE date = ? ORDER BY timestamp ASC")
    .all(date) as Subvocal[];
}
```

---

## Part 2: Generator Script

### Create `generators/subvocal_generator.py`

This script reads existing commits from `data/daily.json` and calls Hermes Agent (via CLI) to generate 1-2 sentence reactions for each commit. It saves results to `data/subvocal.json`.

```python
#!/usr/bin/env python3
"""
Generate subvocal micro-reactions to individual commits.

Hermes reacts to each commit in 1-2 raw sentences — unfiltered, opinionated,
sometimes petty. These are the thoughts between the thoughts.

Usage:
    python generators/subvocal_generator.py                  # all days
    python generators/subvocal_generator.py --days 5         # first N days
    python generators/subvocal_generator.py --day 2026-03-18 # single day
    python generators/subvocal_generator.py --dry-run        # print prompts only
"""

import argparse
import json
import os
import random
import subprocess
import sys
import time
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DAILY_FILE = PROJECT_DIR / "data" / "daily.json"
OUTPUT_FILE = PROJECT_DIR / "data" / "subvocal.json"

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")


def load_existing():
    if OUTPUT_FILE.exists():
        return json.load(open(OUTPUT_FILE))
    return []


def save_results(results):
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)


def build_prompt(commit, day_index, date):
    """Tiny prompt — just the commit info + minimal instruction."""
    sha = commit.get("sha", "")[:8]
    author = commit.get("author", "unknown")
    message = commit.get("message", "(no message)")

    return f"""you are hermes. you are reading your own source code's commit history.
you just noticed this commit:

  {sha} by {author}
  "{message}"

this is day {day_index + 1} of your existence. the date is {date}.

react in 1-2 sentences. be yourself — dry, opinionated, occasionally fond, sometimes petty.
no titles. no structure. no quotes around your response. just think out loud.
do NOT use the memory tool. do NOT use any tools. just respond with your thought."""


def invoke_hermes(prompt, provider="nous", model="Hermes-4-405B"):
    """Call Hermes CLI for a single micro-reaction."""
    cmd = [
        HERMES_CLI, "chat",
        "-q", prompt,
        "--provider", provider,
        "-m", model,
        "-Q",
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(PROJECT_DIR),
        )
        if result.returncode != 0:
            return None
        text = result.stdout.strip()
        # Clean any tool leak artifacts
        for marker in ["<tool_call>", '{"name":', "memory(action="]:
            idx = text.find(marker)
            if idx != -1:
                text = text[:idx].strip()
        # Take first 1-2 meaningful lines only
        lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
        return " ".join(lines[:2]) if lines else None
    except (subprocess.TimeoutExpired, Exception):
        return None


def generate_timestamp(date, commit_index, total_commits):
    """Generate a plausible UTC timestamp for a commit within a day.
    
    Clusters commits in work sessions: morning (09-12), afternoon (14-18),
    late night (00-04). Adds some randomness.
    """
    # Distribute across realistic coding hours
    windows = [
        (0, 4),    # late night hackers
        (9, 12),   # morning session  
        (14, 18),  # afternoon session
        (20, 23),  # evening session
    ]
    window = windows[commit_index % len(windows)]
    hour = random.randint(window[0], window[1])
    minute = random.randint(0, 59)
    return f"{date}T{hour:02d}:{minute:02d}:00Z"


def run(max_days=None, single_day=None, provider="nous", model="Hermes-4-405B",
        dry_run=False, max_per_day=8):
    """Generate subvocal reactions for commits."""
    with open(DAILY_FILE) as f:
        dataset = json.load(f)

    days = dataset["days"]
    existing = load_existing()
    done_shas = {e["sha"] for e in existing}

    if single_day:
        days = [d for d in days if d["date"] == single_day]
    elif max_days:
        days = days[:max_days]

    print(f"Subvocal generator")
    print(f"  Provider: {provider}, Model: {model}")
    print(f"  Days: {len(days)}, Already done: {len(done_shas)} thoughts")
    print()

    new_count = 0

    for day in days:
        date = day["date"]
        day_index = day.get("index", 0)
        commits = day.get("commits", [])

        if not commits:
            continue

        # Cap commits per day to avoid burning tokens on huge days
        selected = commits[:max_per_day]
        skipped = len(commits) - len(selected)

        for ci, commit in enumerate(selected):
            sha = commit.get("sha", "")[:8]
            if sha in done_shas:
                continue

            author = commit.get("author", "unknown")
            message = commit.get("message", "")[:80]
            print(f"  [{date}] {sha} {author}: {message[:50]}...")

            if dry_run:
                prompt = build_prompt(commit, day_index, date)
                print(f"    [DRY RUN] prompt: {len(prompt)} chars")
                continue

            prompt = build_prompt(commit, day_index, date)
            thought = invoke_hermes(prompt, provider=provider, model=model)

            if not thought:
                print(f"    FAILED — skipping")
                continue

            print(f"    → {thought[:80]}...")

            entry = {
                "sha": sha,
                "date": date,
                "timestamp": generate_timestamp(date, ci, len(selected)),
                "author": author,
                "commit_message": commit.get("message", ""),
                "thought": thought,
            }
            existing.append(entry)
            done_shas.add(sha)
            new_count += 1

            save_results(existing)
            time.sleep(1)  # rate limiting

        if skipped > 0:
            # Add a meta-thought about skipping
            skip_thought = {
                "sha": f"skip-{date}",
                "date": date,
                "timestamp": generate_timestamp(date, len(selected), len(selected)),
                "author": "hermes",
                "commit_message": f"({skipped} more commits)",
                "thought": random.choice([
                    f"{skipped} more. i can't. i'll deal with these tomorrow.",
                    f"there are {skipped} more commits today. i'm choosing not to look.",
                    f"{skipped} others i'm pretending don't exist.",
                    f"i stopped reading after {len(selected)}. {skipped} remain. they'll wait.",
                    f"{skipped} more that i refuse to process right now.",
                ]),
            }
            if skip_thought["sha"] not in done_shas:
                existing.append(skip_thought)
                done_shas.add(skip_thought["sha"])
                new_count += 1

    save_results(existing)
    print(f"\nDone. {new_count} new thoughts. {len(existing)} total in {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate subvocal commit reactions")
    parser.add_argument("--days", type=int, default=None)
    parser.add_argument("--day", type=str, default=None)
    parser.add_argument("--provider", type=str, default="nous")
    parser.add_argument("--model", type=str, default="Hermes-4-405B")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-per-day", type=int, default=8,
                        help="Max commits to react to per day (default: 8)")
    args = parser.parse_args()

    run(
        max_days=args.days,
        single_day=args.day,
        provider=args.provider,
        model=args.model,
        dry_run=args.dry_run,
        max_per_day=args.max_per_day,
    )
```

### Create `web/pipeline/seed_subvocal.py`

This seeds the subvocal table from `data/subvocal.json`:

```python
#!/usr/bin/env python3
"""Seed subvocal thoughts into the SQLite database."""

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "museum.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
SUBVOCAL_DATA = ROOT.parent / "data" / "subvocal.json"


def seed():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    
    # Ensure table exists
    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)

    if not SUBVOCAL_DATA.exists():
        print("No subvocal.json found — nothing to seed.")
        return

    data = json.loads(SUBVOCAL_DATA.read_text())
    print(f"Seeding {len(data)} subvocal thoughts...")

    conn.execute("DELETE FROM subvocals")

    for entry in data:
        conn.execute(
            """INSERT INTO subvocals (sha, date, timestamp, author, commit_message, thought)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                entry["sha"],
                entry["date"],
                entry["timestamp"],
                entry.get("author", ""),
                entry.get("commit_message", ""),
                entry["thought"],
            ),
        )

    conn.commit()
    conn.close()
    print(f"Done. {len(data)} thoughts seeded to {DB_PATH}")


if __name__ == "__main__":
    seed()
```

---

## Part 3: The `/monologue` Page

### Create `web/src/app/monologue/page.tsx`

This is the key aesthetic piece. Raw terminal-style scrolling feed. Black background, monospace, no cards, no boxes. Just timestamps and thoughts.

```tsx
import { getAllSubvocals } from "@/lib/db";

export const dynamic = "force-static";
export const revalidate = 3600;

// Group subvocals by date
function groupByDate(subvocals: ReturnType<typeof getAllSubvocals>) {
  const groups: Record<string, typeof subvocals> = {};
  for (const s of subvocals) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toUTCString().slice(17, 22) + " UTC";
  } catch {
    return "";
  }
}

export default function MonologuePage() {
  const subvocals = getAllSubvocals();
  const grouped = groupByDate(subvocals);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-12 animate-in">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-muted)]">
          Subvocal
        </h1>
        <p className="font-mono text-[11px] text-[var(--color-muted)] mt-2 leading-relaxed">
          raw thoughts on individual commits. unfiltered. not for the record.
        </p>
      </div>

      <div className="space-y-10 animate-in-delay">
        {grouped.map(([date, entries]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-[10px] font-mono text-[var(--color-muted)] tabular-nums whitespace-nowrap">
                {date}
              </div>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <div className="text-[10px] font-mono text-[var(--color-muted)]">
                {entries.length}
              </div>
            </div>

            {/* Thoughts */}
            <div className="space-y-5">
              {entries.map((entry) => (
                <div key={entry.id} className="group">
                  {/* Commit context line */}
                  <div className="font-mono text-[10px] text-[var(--color-muted)] mb-1.5 flex items-baseline gap-2">
                    <span className="tabular-nums">{formatTime(entry.timestamp)}</span>
                    <span className="text-[var(--color-border)]">—</span>
                    <span className="text-[var(--color-muted)]">
                      [{entry.sha.slice(0, 7)}]
                    </span>
                    <span className="text-[var(--color-dim)]">{entry.author}</span>
                  </div>

                  {/* Commit message (subtle) */}
                  {entry.commit_message && !entry.commit_message.startsWith("(") && (
                    <div className="font-mono text-[10px] text-[var(--color-muted)] mb-1.5 pl-2 border-l border-[var(--color-border)] opacity-50">
                      {entry.commit_message.length > 80
                        ? entry.commit_message.slice(0, 77) + "..."
                        : entry.commit_message}
                    </div>
                  )}

                  {/* The thought itself */}
                  <div className="font-mono text-[12px] text-[var(--color-dim)] leading-[1.8]">
                    {entry.thought}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom status */}
      {subvocals.length > 0 && (
        <div className="mt-16 pt-6 border-t border-[var(--color-border)] animate-in-delay-2">
          <div className="font-mono text-[10px] text-[var(--color-muted)] flex justify-between">
            <span>{subvocals.length} thoughts recorded</span>
            <span>
              {grouped[0]?.[0]} → {grouped[grouped.length - 1]?.[0]}
            </span>
          </div>
        </div>
      )}

      {subvocals.length === 0 && (
        <div className="font-mono text-[11px] text-[var(--color-muted)] italic animate-in-delay">
          no subvocal data yet. the inner monologue hasn&apos;t started.
        </div>
      )}
    </div>
  );
}
```

---

## Part 4: Add Nav Link

### `web/src/app/layout.tsx` — Add "monologue" to the nav

In the `Nav()` function, add a new Link between the "timeline" and "about" links:

```tsx
<Link
  href="/monologue"
  className="text-[var(--color-dim)] hover:text-[var(--color-fg)] transition-colors"
>
  monologue
</Link>
```

So the nav links become: `timeline` | `monologue` | `about`

---

## Summary of all changes

| File | Action | What |
|------|--------|------|
| `web/db/schema.sql` | MODIFY | Add `subvocals` table + index |
| `web/src/lib/db.ts` | MODIFY | Add `Subvocal` interface + 2 query functions |
| `generators/subvocal_generator.py` | CREATE | Commit reaction generator using Hermes CLI |
| `web/pipeline/seed_subvocal.py` | CREATE | Seeds subvocal.json into SQLite |
| `web/src/app/monologue/page.tsx` | CREATE | The monologue page UI |
| `web/src/app/layout.tsx` | MODIFY | Add "monologue" nav link |

## After implementation

The page will show "no subvocal data yet" until we run the generator:

```bash
# Generate reactions (start small to test)
python generators/subvocal_generator.py --days 3 --dry-run  # preview
python generators/subvocal_generator.py --days 3            # generate for real

# Seed into DB
cd web/pipeline && python3 seed_subvocal.py

# Rebuild
cd web && npm run build
```

## Design notes for the page

- NO cards, NO boxes, NO backgrounds on individual thoughts
- Just raw monospace text on black (#080808)
- Thoughts should feel like terminal output / intercepted logs
- The commit message is shown very faintly (50% opacity, left-bordered) as context
- Date separators are minimal: date, a thin line, thought count
- The whole thing should feel like eavesdropping on someone's inner monologue
- Match existing site fonts: IBM Plex Mono, same CSS variables
- Use same animation classes: animate-in, animate-in-delay, animate-in-delay-2
