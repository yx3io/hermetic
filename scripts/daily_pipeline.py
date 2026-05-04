#!/usr/bin/env python3
"""
Daily pipeline for Hermes Archaeology Museum.
Runs as a cron pre-script — stdout is injected into the Hermes cron agent.

Steps:
  1. Fetch latest commits from GitHub (updates daily.json)
  2. Detect new days that don't have reflections yet
  3. Generate reflections for new days (hermes_reflect_agent.py --day)
  4. Generate images for new days (image_generator.py --day)
  5. Generate subvocals for new days (subvocal_generator.py --day)
  6. Regenerate verdicts for new days
  7. Reseed DB (seed_db.py + seed_subvocal.py)

Prints a status summary to stdout so the cron agent can report what happened.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_DIR = Path("/Users/yyy/Documents/aaaaaaaa/hermetic")
DATA_DIR = PROJECT_DIR / "data"
WEB_DIR = PROJECT_DIR / "web"
DB_PATH = WEB_DIR / "db" / "museum.db"

os.chdir(str(PROJECT_DIR))
sys.path.insert(0, str(PROJECT_DIR))


def run_cmd(cmd, timeout=300, cwd=None, extra_env=None):
    """Run a command, return (success, stdout, stderr)."""
    try:
        env = os.environ.copy()
        if extra_env:
            env.update(extra_env)
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=timeout, cwd=cwd or str(PROJECT_DIR), env=env
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "TIMEOUT"
    except Exception as e:
        return False, "", str(e)


def step_fetch_commits():
    """Step 1: Fetch latest commits from GitHub."""
    print("=== STEP 1: Fetching latest commits ===")

    # Load current state
    daily_path = DATA_DIR / "daily.json"
    with open(daily_path) as f:
        old_data = json.load(f)
    old_dates = {d["date"] for d in old_data["days"]}
    old_count = len(old_dates)

    # Run fetch — get GH token from gh CLI
    gh_token = ""
    try:
        tok_result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=10)
        if tok_result.returncode == 0:
            gh_token = tok_result.stdout.strip()
    except Exception:
        pass

    ok, out, err = run_cmd(
        ["python3", "generators/fetch_daily.py"],
        timeout=120,
        extra_env={"GITHUB_TOKEN": gh_token} if gh_token else None
    )
    if not ok:
        print(f"  WARN: fetch_daily.py failed: {err[:200]}")
        print(f"  Continuing with existing data ({old_count} days)")
        return old_dates

    # Load updated state
    with open(daily_path) as f:
        new_data = json.load(f)
    new_dates = {d["date"] for d in new_data["days"]}
    added = new_dates - old_dates

    if added:
        print(f"  Found {len(added)} new day(s): {', '.join(sorted(added))}")
    else:
        print(f"  No new days. Total: {len(new_dates)}")

    return added


def step_generate_reflections(new_dates):
    """Step 2: Generate reflections for new days."""
    print("\n=== STEP 2: Generating reflections ===")

    # Check which dates already have reflections
    output_path = DATA_DIR / "hermes_output.json"
    existing = {}
    if output_path.exists():
        with open(output_path) as f:
            existing = {e["date"]: e for e in json.load(f)}

    todo = [d for d in sorted(new_dates) if d not in existing]
    if not todo:
        print("  All new days already have reflections.")
        return

    for date in todo:
        print(f"  Generating reflection for {date}...")
        ok, out, err = run_cmd(
            ["python3", "generators/hermes_reflect_agent.py", "--day", date],
            timeout=120
        )
        if ok:
            print(f"    Done.")
        else:
            print(f"    FAILED: {err[:100]}")
        time.sleep(2)


def step_generate_images(new_dates):
    """Step 3: Generate images for new days."""
    print("\n=== STEP 3: Generating images ===")

    image_path = DATA_DIR / "image_artifacts.json"
    existing_dates = set()
    if image_path.exists():
        with open(image_path) as f:
            existing_dates = {e["date"] for e in json.load(f) if e.get("image_filename")}

    todo = [d for d in sorted(new_dates) if d not in existing_dates]
    if not todo:
        print("  All new days already have images.")
        return

    for date in todo:
        print(f"  Generating image for {date}...")
        ok, out, err = run_cmd(
            ["python3", "generators/image_generator.py", "--day", date],
            timeout=200
        )
        if ok:
            print(f"    Done.")
        else:
            print(f"    FAILED: {err[:100]}")
        time.sleep(3)


def step_generate_subvocals(new_dates):
    """Step 4: Generate subvocals for new days."""
    print("\n=== STEP 4: Generating subvocals ===")

    for date in sorted(new_dates):
        print(f"  Generating subvocals for {date}...")
        ok, out, err = run_cmd(
            ["python3", "generators/subvocal_generator.py", "--day", date],
            timeout=180
        )
        if ok:
            print(f"    Done.")
        else:
            print(f"    FAILED: {err[:100]}")
        time.sleep(2)


def step_generate_verdict(new_dates):
    """Step 5: Generate verdicts for new days via hermes."""
    print("\n=== STEP 5: Generating verdicts ===")

    import sqlite3

    # First we need to seed so the artifacts exist, then update verdicts
    # We'll do this after seed_db in step 6 instead
    print("  (deferred to after DB seed)")


def step_seed_db():
    """Step 6: Reseed DB from JSON data."""
    print("\n=== STEP 6: Seeding database ===")

    # First, save existing verdicts so we can restore them
    import sqlite3
    verdicts = {}
    if DB_PATH.exists():
        conn = sqlite3.connect(str(DB_PATH))
        try:
            rows = conn.execute("SELECT date, verdict FROM artifacts WHERE verdict IS NOT NULL AND verdict != ''").fetchall()
            verdicts = {r[0]: r[1] for r in rows}
            print(f"  Backed up {len(verdicts)} existing verdicts")
        except Exception:
            pass
        conn.close()

    # Run seed_db.py
    ok, out, err = run_cmd(
        ["python3", "pipeline/seed_db.py"],
        timeout=60,
        cwd=str(WEB_DIR)
    )
    if ok:
        print(f"  seed_db.py done.")
    else:
        print(f"  seed_db.py FAILED: {err[:200]}")
        return

    # Run seed_subvocal.py
    ok, out, err = run_cmd(
        ["python3", "pipeline/seed_subvocal.py"],
        timeout=60,
        cwd=str(WEB_DIR)
    )
    if ok:
        print(f"  seed_subvocal.py done.")
    else:
        print(f"  seed_subvocal.py FAILED: {err[:200]}")

    # Restore old verdicts
    if verdicts:
        conn = sqlite3.connect(str(DB_PATH))
        restored = 0
        for date, verdict in verdicts.items():
            conn.execute("UPDATE artifacts SET verdict = ? WHERE date = ? AND (verdict IS NULL OR verdict = '')",
                         (verdict, date))
            restored += conn.execute("SELECT changes()").fetchone()[0]
        conn.commit()
        conn.close()
        print(f"  Restored {restored} verdicts")


def step_generate_new_verdicts(new_dates):
    """Step 7: Generate verdicts for any artifacts that don't have them."""
    print("\n=== STEP 7: Generating verdicts for new days ===")

    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    rows = conn.execute(
        "SELECT id, date, title FROM artifacts WHERE verdict IS NULL OR verdict = '' ORDER BY date"
    ).fetchall()

    if not rows:
        print("  All artifacts have verdicts.")
        conn.close()
        return

    print(f"  {len(rows)} artifact(s) need verdicts")

    titles_list = "\n".join(f"{r[0]}|{r[1]}|{r[2]}" for r in rows)
    prompt = f"""here are daily reflection titles from hermes examining its own source code.
for each one, write a short sarcastic/funny verdict (1-5 words, lowercase, no period).
these appear as tiny annotations under each reflection on a website.

they should be varied — witty, dry, petty, fond, dismissive, amused. mix it up.
examples: "who asked", "not my problem", "sure jan", "bold move", "they tried", "oh well", "noted", "fair enough", "classic", "peak chaos"

respond with ONLY the lines in format: ID|verdict
nothing else. no explanation.

{titles_list}"""

    ok, out, err = run_cmd(
        ["hermes", "chat", "-q", prompt, "--provider", "nous", "-m", "Hermes-4-405B", "-Q"],
        timeout=120
    )

    if not ok:
        print(f"  Verdict generation failed: {err[:100]}")
        conn.close()
        return

    updated = 0
    for line in out.strip().splitlines():
        line = line.strip()
        if "|" not in line:
            continue
        parts = line.split("|", 1)
        try:
            art_id = int(parts[0].strip())
        except ValueError:
            continue
        verdict = parts[1].strip().strip('"').strip("'").rstrip(".")
        if 2 <= len(verdict) <= 40:
            conn.execute("UPDATE artifacts SET verdict = ? WHERE id = ?", (verdict, art_id))
            updated += 1

    conn.commit()
    conn.close()
    print(f"  Updated {updated} verdicts")


def main():
    start = time.time()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"Hermetic Museum daily pipeline — {today}")
    print(f"Project: {PROJECT_DIR}")
    print()

    # Step 1: Fetch commits
    new_dates = step_fetch_commits()

    if not new_dates:
        # Even if no new days from fetch, check for days missing reflections/images
        daily_path = DATA_DIR / "daily.json"
        with open(daily_path) as f:
            all_dates = {d["date"] for d in json.load(f)["days"]}

        output_path = DATA_DIR / "hermes_output.json"
        if output_path.exists():
            with open(output_path) as f:
                have_reflections = {e["date"] for e in json.load(f)}
        else:
            have_reflections = set()

        missing = all_dates - have_reflections
        if missing:
            print(f"\nFound {len(missing)} days missing reflections: {', '.join(sorted(missing))}")
            new_dates = missing
        else:
            print("\nEverything up to date. Nothing to do.")
            elapsed = time.time() - start
            print(f"\nPipeline complete in {elapsed:.0f}s")
            return

    # Steps 2-5: Generate content for new days
    step_generate_reflections(new_dates)
    step_generate_images(new_dates)
    step_generate_subvocals(new_dates)

    # Step 6: Seed DB (preserves existing verdicts)
    step_seed_db()

    # Step 7: Generate verdicts for new entries
    step_generate_new_verdicts(new_dates)

    elapsed = time.time() - start
    print(f"\nPipeline complete in {elapsed:.0f}s")
    print(f"New days processed: {len(new_dates)}")


if __name__ == "__main__":
    main()
