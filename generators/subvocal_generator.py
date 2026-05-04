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
    """Call Hermes CLI or direct API for a single micro-reaction."""
    from generators.nous_api import use_direct_api, chat, clean_response

    if use_direct_api():
        try:
            raw = chat(prompt, model=model, timeout=60)
            text = clean_response(raw)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            return " ".join(lines[:2]) if lines else None
        except Exception:
            return None

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
        for marker in ["<tool_call>", '{"name":', "memory(action="]:
            idx = text.find(marker)
            if idx != -1:
                text = text[:idx].strip()
        lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
        return " ".join(lines[:2]) if lines else None
    except (subprocess.TimeoutExpired, Exception):
        return None


def generate_timestamp(date, commit_index, total_commits):
    """Generate a plausible UTC timestamp for a commit within a day."""
    windows = [
        (0, 4),
        (9, 12),
        (14, 18),
        (20, 23),
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
            time.sleep(1)

        if skipped > 0:
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
