#!/usr/bin/env python3
"""
Poll NousResearch/hermes-agent for new commits, generate subvocal
reactions, and tweet them. Designed to run every ~15 min in GitHub Actions.

Tracks the last processed commit SHA in data/last_commit.txt.
Generates a subvocal thought for each new commit, appends to
data/subvocal.json, then tweets via tweet_poster.py.

Usage:
    python generators/commit_watcher.py              # normal run
    python generators/commit_watcher.py --dry-run    # preview only
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

import requests

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
SUBVOCAL_FILE = DATA_DIR / "subvocal.json"
DAILY_FILE = DATA_DIR / "daily.json"
LAST_COMMIT_FILE = DATA_DIR / "last_commit.txt"
ENV_FILE = PROJECT_DIR / ".env"

REPO = "NousResearch/hermes-agent"
API_BASE = f"https://api.github.com/repos/{REPO}"
HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")

MAX_COMMITS_PER_RUN = 8


def init_env():
    if load_dotenv and ENV_FILE.exists():
        load_dotenv(ENV_FILE)


def github_session():
    session = requests.Session()
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        session.headers["Authorization"] = f"token {token}"
    session.headers["Accept"] = "application/vnd.github.v3+json"
    session.headers["User-Agent"] = "hermes-hermetic-museum"
    return session


def get_last_commit_sha():
    if LAST_COMMIT_FILE.exists():
        return LAST_COMMIT_FILE.read_text().strip()
    return None


def save_last_commit_sha(sha):
    LAST_COMMIT_FILE.write_text(sha + "\n")


def fetch_recent_commits(session, since_sha=None):
    """Fetch recent commits from the repo. Returns newest-first."""
    params = {"per_page": 30}
    resp = session.get(f"{API_BASE}/commits", params=params)

    if resp.status_code == 403 and "rate limit" in resp.text.lower():
        print("Rate limited by GitHub API, will retry next run.")
        return []

    resp.raise_for_status()
    all_commits = resp.json()

    if not since_sha:
        return all_commits[:MAX_COMMITS_PER_RUN]

    new_commits = []
    for c in all_commits:
        if c["sha"].startswith(since_sha) or since_sha.startswith(c["sha"][:8]):
            break
        new_commits.append(c)

    return new_commits[:MAX_COMMITS_PER_RUN]


def compute_day_index(date_str):
    """Estimate day index from daily.json or fall back to days since epoch."""
    if DAILY_FILE.exists():
        with open(DAILY_FILE) as f:
            dataset = json.load(f)
        for day in dataset.get("days", []):
            if day["date"] == date_str:
                return day.get("index", 0)
        return len(dataset.get("days", []))
    return 0


def build_subvocal_prompt(commit_info, day_index, date_str):
    sha = commit_info["sha"][:8]
    author = commit_info["author"]
    message = commit_info["message"]

    return f"""you are hermes. you are reading your own source code's commit history.
you just noticed this commit:

  {sha} by {author}
  "{message}"

this is day {day_index + 1} of your existence. the date is {date_str}.

react in 1-2 sentences. be yourself — dry, opinionated, occasionally fond, sometimes petty.
no titles. no structure. no quotes around your response. just think out loud.
do NOT use the memory tool. do NOT use any tools. just respond with your thought."""


def invoke_hermes(prompt, provider="nous", model="Hermes-4-405B"):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from nous_api import use_direct_api, chat, clean_response

    if use_direct_api():
        try:
            raw = chat(prompt, model=model, timeout=90)
            text = clean_response(raw)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            return " ".join(lines[:2]) if lines else None
        except Exception as e:
            print(f"  API error: {e}")
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
            cmd, capture_output=True, text=True, timeout=90,
            cwd=str(PROJECT_DIR),
        )
        if result.returncode != 0:
            print(f"  Hermes CLI failed (exit {result.returncode})")
            if result.stderr:
                print(f"  stderr: {result.stderr[:200]}")
            return None
        text = result.stdout.strip()
        for marker in ["<tool_call>", '{"name":', "memory(action="]:
            idx = text.find(marker)
            if idx != -1:
                text = text[:idx].strip()
        lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
        return " ".join(lines[:2]) if lines else None
    except subprocess.TimeoutExpired:
        print("  Hermes CLI timed out")
        return None
    except Exception as e:
        print(f"  Hermes CLI error: {e}")
        return None


def load_subvocals():
    if SUBVOCAL_FILE.exists():
        return json.load(open(SUBVOCAL_FILE))
    return []


def save_subvocals(data):
    with open(SUBVOCAL_FILE, "w") as f:
        json.dump(data, f, indent=2)


def trigger_vercel_redeploy():
    hook_url = os.environ.get("VERCEL_DEPLOY_HOOK")
    if not hook_url:
        return
    try:
        resp = requests.post(hook_url, timeout=10)
        print(f"  Vercel redeploy triggered (status {resp.status_code})")
    except Exception as e:
        print(f"  Vercel redeploy failed: {e}")


def run(dry_run=False, provider="nous", model="Hermes-4-405B"):
    init_env()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    session = github_session()
    last_sha = get_last_commit_sha()

    print(f"Commit watcher for {REPO}")
    print(f"  Last processed: {last_sha or '(none)'}")

    new_commits = fetch_recent_commits(session, since_sha=last_sha)

    if not new_commits:
        print("  No new commits. Done.")
        return 0

    new_commits.reverse()
    print(f"  Found {len(new_commits)} new commit(s)\n")

    subvocals = load_subvocals()
    done_shas = {e["sha"] for e in subvocals}
    generated = []

    for c in new_commits:
        sha_short = c["sha"][:8]
        author = c["commit"]["author"]["name"]
        message = c["commit"]["message"].split("\n")[0][:120]
        date_str = c["commit"]["author"]["date"][:10]
        day_index = compute_day_index(date_str)

        print(f"  [{date_str}] {sha_short} {author}: {message[:60]}")

        if sha_short in done_shas:
            print(f"    Already have subvocal, skipping generation")
        elif dry_run:
            print(f"    [DRY RUN] would generate subvocal")
        else:
            prompt = build_subvocal_prompt(
                {"sha": c["sha"], "author": author, "message": message},
                day_index, date_str,
            )
            thought = invoke_hermes(prompt, provider=provider, model=model)
            if thought:
                print(f"    thought: {thought[:80]}")
                now = datetime.now(timezone.utc).isoformat()
                entry = {
                    "sha": sha_short,
                    "date": date_str,
                    "timestamp": now,
                    "author": author,
                    "commit_message": message,
                    "thought": thought,
                }
                subvocals.append(entry)
                done_shas.add(sha_short)
                generated.append(entry)
                save_subvocals(subvocals)
                time.sleep(1)
            else:
                print(f"    FAILED to generate subvocal")

    newest_sha = new_commits[-1]["sha"][:8]
    if not dry_run:
        save_last_commit_sha(newest_sha)
        print(f"\n  Updated last_commit.txt to {newest_sha}")

    if generated and not dry_run:
        print(f"\n  Tweeting {len(generated)} new subvocal(s)...")
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from tweet_poster import run as tweet_run
        tweet_run(max_tweets=len(generated), dry_run=dry_run)

        trigger_vercel_redeploy()

    print(f"\nDone. {len(generated)} new subvocals generated.")
    return len(generated)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Watch for new commits and react")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--provider", default="nous")
    parser.add_argument("--model", default="Hermes-4-405B")
    args = parser.parse_args()

    run(dry_run=args.dry_run, provider=args.provider, model=args.model)
