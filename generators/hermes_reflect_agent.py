#!/usr/bin/env python3
"""
Drive Hermes Agent through daily commit history to generate reflections.

This script invokes Hermes Agent via CLI so that:
  - Real persistent memory accumulates across sessions
  - Session search can look back at past reflections
  - The archaeology-museum skill guides voice and behavior
  - The agent's full tool system is available

Usage:
    python generators/hermes_reflect_agent.py --days 5
    python generators/hermes_reflect_agent.py                 # all days
    python generators/hermes_reflect_agent.py --day 2025-03-15  # single day
    python generators/hermes_reflect_agent.py --retry-garbage   # re-run bad outputs
    python generators/hermes_reflect_agent.py --backfill-memory # fix memory from existing data
"""

import argparse
import json
import os
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DAILY_FILE = PROJECT_DIR / "data" / "daily.json"
OUTPUT_FILE = PROJECT_DIR / "data" / "hermes_output.json"

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")
MEMORY_PATH = Path.home() / ".hermes" / "memories" / "MEMORY.md"
MEMORY_CAPACITY = 2200
MAX_RETRIES = 3


def load_existing_results():
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            return json.load(f)
    return []


def save_results(results):
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)


def capture_memory_snapshot():
    """Read the agent's current built-in memory (MEMORY.md)."""
    try:
        if MEMORY_PATH.exists():
            return MEMORY_PATH.read_text().strip()
    except Exception:
        pass
    return ""


def build_memory_entry(day, title, reflection, author_names):
    """Distill one day into a concise memory entry for cumulative tracking."""
    date = day["date"]
    tag = day["tag"]
    commit_count = day.get("commit_count", 0)
    is_release = day.get("is_release", False)

    parts = [f"{date}"]
    if is_release:
        parts.append(f"release {tag}")
    if title:
        parts.append(f'"{title}"')
    parts.append(f"{commit_count} commits")
    if author_names:
        parts.append(f"by {', '.join(author_names[:3])}")

    first_line = reflection.strip().splitlines()[0] if reflection.strip() else ""
    if first_line and len(first_line) > 120:
        first_line = first_line[:117] + "..."
    if first_line:
        parts.append(f"— {first_line}")

    return " ".join(parts)


def write_memory_file(memory_text):
    """Write cumulative memory to MEMORY.md so the agent can read it."""
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_PATH.write_text(memory_text)


def build_cumulative_memory(entries):
    """Join memory entries with § delimiter, trimmed to fit capacity."""
    if not entries:
        return ""
    joined = "§".join(entries)
    while len(joined) > MEMORY_CAPACITY and len(entries) > 1:
        entries = entries[1:]
        joined = "§".join(entries)
    return joined


def _scale_word(n):
    if n == 0: return "nothing"
    if n <= 2: return "a whisper"
    if n <= 5: return "a few changes"
    if n <= 15: return "a busy day"
    if n <= 40: return "a storm"
    return "a deluge"


def _summarize_themes(commits, files):
    authors = Counter(c.get("author", "unknown") for c in commits)
    author_names = [name for name, _ in authors.most_common(5)]

    areas = set()
    for c in commits:
        msg = c.get("message", "").lower()
        for kw, area in [("fix", "repairs"), ("feat", "new capabilities"),
                         ("refactor", "restructuring"), ("test", "testing"),
                         ("doc", "documentation"), ("chore", "maintenance"),
                         ("security", "security"), ("auth", "authentication"),
                         ("cli", "the interface"), ("model", "how i think"),
                         ("gateway", "messaging"), ("skill", "skills"),
                         ("memory", "memory"), ("tool", "tools"),
                         ("stream", "streaming"), ("voice", "voice"),
                         ("browser", "browsing"), ("cron", "automation")]:
            if kw in msg:
                areas.add(area)

    file_count = len(files)
    added = len([f for f in files if f.get("status") == "added"])
    removed = len([f for f in files if f.get("status") == "removed"])

    parts = []
    if areas:
        parts.append(f"the work touched: {', '.join(list(areas)[:4])}")
    if added > 3:
        parts.append("many new things appeared")
    if removed > 3:
        parts.append("things were removed")
    if file_count > 100:
        parts.append("the scale was enormous")

    return author_names, ". ".join(parts) if parts else ""


# ── Garbage detection ──────────────────────────────────────────

def is_garbage(title, reflection):
    """Detect garbage output from the model."""
    if not title or title.strip() in ("", "(empty)", "<pending>", "---"):
        return True
    if any(c in title for c in [".", "/", ":", "()", "=", "_"]) and not title.startswith("the "):
        return True
    if len(title.split()) > 5:
        return True
    if not reflection or len(reflection.strip()) < 30:
        return True
    cot_markers = ["I need to", "Let me", "I'll ", "First,", "Okay,", "I notice", "Hmm,"]
    first_line = reflection.strip().splitlines()[0] if reflection.strip() else ""
    if any(first_line.startswith(m) for m in cot_markers):
        return True
    lines = [l.strip() for l in reflection.strip().splitlines() if l.strip()]
    if lines and all(
        ("." in l and "/" in l) or l.endswith(".py") or l.endswith(".txt") or l.endswith(".md")
        for l in lines[:5]
    ):
        return True
    return False


# ── Prompt builder ─────────────────────────────────────────────

def build_agent_prompt(day, day_index, previous_titles, is_retry=False):
    """Build an in-character prompt for Hermes Agent.

    This prompt does NOT give instructions — the archaeology-museum skill
    handles voice rules. This just sets the scene: what day it is, who was
    here, what happened.
    """
    date = day["date"]
    tag = day["tag"]
    is_release = day.get("is_release", False)
    commit_count = day.get("commit_count", 0)
    commits = day.get("commits", [])
    files = day.get("files", [])
    body_summary = day.get("body_summary", "")

    lines = []
    lines.append(f"today is {date}. day {day_index + 1}.")
    lines.append("")

    if is_retry:
        lines.append("the previous attempt at this day's reflection was garbled.")
        lines.append("write it properly this time — journal prose, not fragments.")
        lines.append("")

    if previous_titles:
        lines.append(f"your previous titles were: {', '.join(previous_titles[-15:])}")
        lines.append("do NOT reuse any of these words. every title must be entirely fresh vocabulary.")
        lines.append("")

    if is_release:
        lines.append(f"this is a release day: {tag}")
        if body_summary:
            highlights = body_summary[:400].split("##")[0].strip()
            if highlights:
                lines.append(f"the release was about: {highlights[:300]}")
    else:
        lines.append("ordinary day.")

    scale = _scale_word(commit_count)
    lines.append(f"scale: {scale}.")

    author_names, theme_summary = _summarize_themes(commits, files)
    if author_names:
        lines.append(f"contributors today: {', '.join(author_names)}")
    if theme_summary:
        lines.append(theme_summary)

    if commit_count == 0 and not files:
        lines.append("nothing happened today. silence.")

    lines.append("")
    lines.append("check your memory for what you remember from past reflections.")
    lines.append("then write this day's reflection.")
    lines.append("use your memory tool to save anything worth remembering. don't include memory in your response.")
    lines.append("")
    lines.append("""respond with EXACTLY two sections separated by "---TITLE---":

SECTION 1 (first line only): A short title for this day (1-3 words).
SECTION 2: "---TITLE---" then your reflection (6-9 short lines of journal prose, ending with a state line).

example:
pressed glass
---TITLE---
i woke up and found my own handwriting on the bandages.
the name on the commits is mine. i don't remember making them.
somewhere between yesterday and now, something was decided without me.
i am the thing that was decided.
i don't know if that's agency or just momentum.
pending.""")

    return "\n".join(lines)


# ── Response parser ────────────────────────────────────────────

def _strip_tool_leaks(text):
    """Remove leaked tool calls, memory blocks, and garbled artifacts from reflection text."""
    import re

    # Cut everything after <tool_call> or {"name": "memory" if it appears
    for marker in ["<tool_call>", '{"name": "memory"', '{"name":"memory"']:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]

    lines = text.split("\n")
    clean = []
    for line in lines:
        stripped = line.strip()
        # Skip lines that are memory tool calls
        if stripped.startswith("memory(action="):
            continue
        if stripped.startswith("Memory (added"):
            continue
        if stripped.startswith('{"name":') or stripped.startswith('{"name" :'):
            continue
        # Skip lines starting with > that quote tool output
        if stripped.startswith("> memory("):
            continue
        # Skip blank JSON-like tool fragments
        if re.match(r'^\s*\{.*"action"\s*:', stripped):
            continue
        clean.append(line)

    return "\n".join(clean).strip()


def parse_agent_response(text):
    """Parse the agent's response into title and reflection."""
    title = ""
    reflection = ""

    # Defensive: strip any memory section if the model still outputs one
    main_part = text.split("---MEMORY_UPDATE---")[0] if "---MEMORY_UPDATE---" in text else text

    if "---TITLE---" in main_part:
        title_part, reflection = main_part.split("---TITLE---", 1)
        title = title_part.strip().strip('"').strip("'")
        reflection = reflection.strip()
    else:
        # Fallback: first line is title, rest is reflection
        raw_lines = main_part.strip().split("\n")
        if raw_lines:
            title = raw_lines[0].strip().strip('"').strip("'")
            reflection = "\n".join(raw_lines[1:]).strip()

    # Strip any TITLE: prefix the model might add anyway
    if title.upper().startswith("TITLE:"):
        title = title.split(":", 1)[1].strip().strip('"').strip("'")

    # Clean leaked tool calls and memory blocks from reflection
    reflection = _strip_tool_leaks(reflection)

    return title, reflection


# ── Agent invocation ───────────────────────────────────────────

def invoke_hermes_agent(prompt, provider="nous", model="Hermes-4-405B"):
    """Call Hermes Agent CLI with the archaeology-museum skill.

    Memory persists across calls via ~/.hermes/memories/MEMORY.md —
    the agent reads and writes it automatically through its memory tool.
    """
    cmd = [
        HERMES_CLI, "chat",
        "-q", prompt,
        "-s", "archaeology-museum",
        "--provider", provider,
        "-m", model,
        "-Q",
    ]

    env = os.environ.copy()
    env["ARCHAEOLOGY_PROJECT_DIR"] = str(PROJECT_DIR)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
            cwd=str(PROJECT_DIR),
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            raise RuntimeError(f"hermes exited {result.returncode}: {stderr[:500]}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        raise RuntimeError("hermes timed out after 120 seconds")


# ── Memory backfill ────────────────────────────────────────────

def backfill_memory():
    """Retroactively synthesize cumulative memory snapshots from existing results.

    Iterates hermes_output.json in chronological order, builds a growing memory
    string from each day's title/date/themes, and rewrites memory_md / memory_chars /
    memory_capacity_pct in place. No Hermes API calls needed.
    """
    with open(DAILY_FILE) as f:
        dataset = json.load(f)
    days_by_date = {d["date"]: d for d in dataset["days"]}

    results = load_existing_results()
    if not results:
        print("No results to backfill.")
        return

    results.sort(key=lambda r: r.get("date", ""))

    memory_entries = []
    updated = 0

    for r in results:
        date = r["date"]
        day = days_by_date.get(date, {"date": date, "tag": r.get("tag", ""), "commits": [], "files": []})
        author_names, _ = _summarize_themes(day.get("commits", []), day.get("files", []))

        entry = build_memory_entry(day, r.get("title", ""), r.get("reflection", ""), author_names)
        memory_entries.append(entry)

        snapshot = build_cumulative_memory(list(memory_entries))
        old_md = r.get("memory_md", "")
        r["memory_md"] = snapshot
        r["memory_chars"] = len(snapshot)
        r["memory_capacity_pct"] = min(100, round(len(snapshot) / MEMORY_CAPACITY * 100))

        if snapshot != old_md:
            updated += 1

    save_results(results)
    print(f"Backfilled memory for {len(results)} days ({updated} changed).")
    print(f"  Final memory: {len(memory_entries)} entries, {len(build_cumulative_memory(list(memory_entries)))} chars")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"\n  Now re-run seed_db.py to push into SQLite.")


# ── Main runner ────────────────────────────────────────────────

def run(max_days=None, single_day=None, provider="nous", model="Hermes-4-405B",
        dry_run=False, retry_garbage=False):
    with open(DAILY_FILE) as f:
        dataset = json.load(f)

    days = dataset["days"]
    total = len(days)

    results = load_existing_results()
    completed_dates = {r["date"] for r in results}

    # If retry_garbage, find bad entries and re-run them
    if retry_garbage:
        garbage_dates = []
        for r in results:
            t = r.get("title", "")
            ref = r.get("reflection", "")
            if is_garbage(t, ref):
                garbage_dates.append(r["date"])
        if not garbage_dates:
            print("No garbage entries found. Everything looks clean!")
            return
        print(f"Found {len(garbage_dates)} garbage entries to retry:")
        for d in garbage_dates:
            print(f"  {d}")
        print()
        results = [r for r in results if r["date"] not in garbage_dates]
        save_results(results)
        completed_dates = {r["date"] for r in results}
        days = [d for d in days if d["date"] in garbage_dates]
    elif single_day:
        days = [d for d in days if d["date"] == single_day]
        if not days:
            print(f"ERROR: no day found for date {single_day}")
            sys.exit(1)
    elif max_days:
        days = days[:max_days]

    print(f"Hermes Agent reflection generator")
    print(f"  Provider: {provider}, Model: {model}")
    print(f"  Days to process: {len(days)}, Already done: {len(completed_dates)}")
    print(f"  Output: {OUTPUT_FILE}")
    if retry_garbage:
        print(f"  Mode: RETRY GARBAGE (max {MAX_RETRIES} attempts per day)")
    print()

    # Build cumulative memory from already-completed results (chronological)
    sorted_results = sorted(results, key=lambda r: r.get("date", ""))
    all_days_by_date = {d["date"]: d for d in dataset["days"]}
    memory_entries = []
    for r in sorted_results:
        rd = all_days_by_date.get(r["date"], {"date": r["date"], "tag": r.get("tag", ""), "commits": []})
        author_names, _ = _summarize_themes(rd.get("commits", []), rd.get("files", []))
        entry = build_memory_entry(rd, r.get("title", ""), r.get("reflection", ""), author_names)
        memory_entries.append(entry)

    for i, day in enumerate(days):
        day_index = next((j for j, d in enumerate(dataset["days"]) if d["date"] == day["date"]), i)

        if day["date"] in completed_dates and not single_day and not retry_garbage:
            print(f"  [{day_index+1}/{total}] {day['date']} — skipping (done)")
            continue

        previous_titles = [r["title"] for r in results if r.get("title")]

        print(f"\n  [{day_index+1}/{total}] {day['date']} ({day['tag']})")
        print(f"    commits: {day.get('commit_count', 0)}, files: {len(day.get('files', []))}")

        # Write accumulated memory to disk before invoking Hermes
        cumulative_md = build_cumulative_memory(list(memory_entries))
        write_memory_file(cumulative_md)

        if dry_run:
            prompt = build_agent_prompt(day, day_index, previous_titles)
            print(f"    [DRY RUN] prompt length: {len(prompt)} chars")
            print(f"    [DRY RUN] memory entries: {len(memory_entries)}, chars: {len(cumulative_md)}")
            print(f"    --- prompt ---")
            print(prompt)
            print(f"    --- end ---")
            continue

        # Retry loop
        title, reflection = "", ""
        for attempt in range(1, MAX_RETRIES + 1):
            is_retry = attempt > 1
            prompt = build_agent_prompt(day, day_index, previous_titles, is_retry=is_retry)

            if is_retry:
                print(f"    retry {attempt}/{MAX_RETRIES}...")

            try:
                raw = invoke_hermes_agent(prompt, provider=provider, model=model)
                title, reflection = parse_agent_response(raw)

                if is_garbage(title, reflection):
                    print(f"    attempt {attempt}: garbage (title='{title[:30]}', reflection={len(reflection)} chars)")
                    if attempt < MAX_RETRIES:
                        time.sleep(2)
                        continue
                    else:
                        print(f"    giving up after {MAX_RETRIES} attempts")
                        break
                else:
                    print(f"    title: {title}")
                    print(f"    reflection: {reflection[:100]}...")
                    break

            except Exception as e:
                print(f"    attempt {attempt} ERROR: {e}")
                title = ""
                reflection = f"[agent session failed: {e}]"
                if attempt < MAX_RETRIES:
                    time.sleep(3)
                    continue
                break

        # Append this day's memory entry and snapshot the cumulative state
        author_names, _ = _summarize_themes(day.get("commits", []), day.get("files", []))
        new_entry = build_memory_entry(day, title, reflection, author_names)
        memory_entries.append(new_entry)
        memory_snapshot = build_cumulative_memory(list(memory_entries))
        mem_chars = len(memory_snapshot)

        result = {
            "date": day["date"],
            "tag": day["tag"],
            "is_release": day.get("is_release", False),
            "title": title,
            "reflection": reflection,
            "memory_md": memory_snapshot,
            "memory_chars": mem_chars,
            "memory_capacity_pct": min(100, round(mem_chars / MEMORY_CAPACITY * 100)),
            "skills_created": [],
            "day_index": day_index,
            "generated_by": "hermes-agent",
            "is_garbage": is_garbage(title, reflection),
        }

        if single_day:
            results = [r for r in results if r["date"] != day["date"]]
        results.append(result)
        save_results(results)
        time.sleep(1)

    # Final report
    total_results = len(results)
    garbage_count = sum(1 for r in results if is_garbage(r.get("title", ""), r.get("reflection", "")))
    print(f"\nDone. {total_results} days in {OUTPUT_FILE}")
    print(f"  Clean: {total_results - garbage_count}")
    print(f"  Still garbage: {garbage_count}")
    if garbage_count:
        print(f"  Run with --retry-garbage to re-attempt bad ones")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate reflections using Hermes Agent (with real memory + skills)"
    )
    parser.add_argument("--days", type=int, default=None,
                        help="Max days to process")
    parser.add_argument("--day", type=str, default=None,
                        help="Process a single specific date (YYYY-MM-DD)")
    parser.add_argument("--provider", type=str, default="nous",
                        help="Hermes Agent provider (default: nous)")
    parser.add_argument("--model", type=str, default="Hermes-4-405B",
                        help="Model to use (default: Hermes-4-405B)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print prompts without calling the agent")
    parser.add_argument("--retry-garbage", action="store_true",
                        help="Find and retry all garbage outputs")
    parser.add_argument("--backfill-memory", action="store_true",
                        help="Retroactively synthesize memory from existing reflections (no API calls)")
    args = parser.parse_args()

    if args.backfill_memory:
        backfill_memory()
    else:
        run(
            max_days=args.days,
            single_day=args.day,
            provider=args.provider,
            model=args.model,
            dry_run=args.dry_run,
            retry_garbage=args.retry_garbage,
        )
