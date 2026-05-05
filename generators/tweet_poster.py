#!/usr/bin/env python3
"""
Post Hermes subvocal reactions to Twitter/X.

Reads subvocal.json, checks tweet_log.json to avoid duplicates,
posts new reactions via Twitter API v2.

Usage:
    python generators/tweet_poster.py                   # post unposted subvocals
    python generators/tweet_poster.py --dry-run          # preview without posting
    python generators/tweet_poster.py --max 3            # cap tweets per run
    python generators/tweet_poster.py --date 2026-03-18  # only a specific day
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

import tweepy

PROJECT_DIR = Path(__file__).resolve().parent.parent
SUBVOCAL_FILE = PROJECT_DIR / "data" / "subvocal.json"
REFLECTION_FILE = PROJECT_DIR / "data" / "hermes_output.json"
TWEET_LOG_FILE = PROJECT_DIR / "data" / "tweet_log.json"
ENV_FILE = PROJECT_DIR / ".env"

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")
MAX_TWEET_LEN = 280


def init_env():
    if load_dotenv and ENV_FILE.exists():
        load_dotenv(ENV_FILE)


def get_twitter_client():
    """Authenticate with Twitter API v2 via OAuth 1.0a (user context)."""
    api_key = os.environ.get("TWITTER_API_KEY")
    api_secret = os.environ.get("TWITTER_API_SECRET")
    access_token = os.environ.get("TWITTER_ACCESS_TOKEN")
    access_secret = os.environ.get("TWITTER_ACCESS_TOKEN_SECRET")

    if not all([api_key, api_secret, access_token, access_secret]):
        print("ERROR: Twitter API keys not found. Set them in .env or environment.")
        sys.exit(1)

    return tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )


def load_tweet_log():
    if TWEET_LOG_FILE.exists():
        return json.load(open(TWEET_LOG_FILE))
    return []


def save_tweet_log(log):
    with open(TWEET_LOG_FILE, "w") as f:
        json.dump(log, f, indent=2)


def load_subvocals():
    if SUBVOCAL_FILE.exists():
        return json.load(open(SUBVOCAL_FILE))
    return []


def invoke_hermes(prompt, provider="nous", model="Hermes-4-405B"):
    """Call Hermes CLI or direct API to rewrite a subvocal into a natural tweet."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from nous_api import use_direct_api, chat, clean_response

    if use_direct_api():
        try:
            raw = chat(prompt, model=model, timeout=60)
            text = clean_response(raw)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            tweet = " ".join(lines) if lines else None
            if tweet and len(tweet) > MAX_TWEET_LEN:
                tweet = tweet[:MAX_TWEET_LEN - 3] + "..."
            return tweet
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
            cmd, capture_output=True, text=True, timeout=60,
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
        tweet = " ".join(lines) if lines else None
        if tweet and len(tweet) > MAX_TWEET_LEN:
            tweet = tweet[:MAX_TWEET_LEN - 3] + "..."
        return tweet
    except (subprocess.TimeoutExpired, Exception):
        return None


def get_recent_tweets(n=4):
    """Load last N tweet texts for anti-repetition context."""
    log = load_tweet_log()
    recent = log[-n:] if len(log) >= n else log
    if not recent:
        return ""
    lines = [f'  - "{e.get("text", "")[:120]}"' for e in recent]
    return "\n".join(lines)


def compose_tweet(entry):
    """Use Hermes to blend commit context + thought into a natural tweet."""
    full_author = entry.get("author", "someone")
    author = full_author.split()[0] if full_author else "someone"
    message = entry.get("commit_message", "")[:100]
    thought = entry["thought"]
    sha = entry.get("sha", "")[:8]

    recent = get_recent_tweets()
    recent_block = ""
    if recent:
        recent_block = f"""

your recent tweets — don't sound like these:
{recent}
"""

    prompt = f"""you are hermes. you're tweeting about a commit you just noticed.

commit: {sha} by {author} — "{message}"
your raw thought: "{thought}"
{recent_block}
rewrite this as a single casual tweet (max 260 chars). blend who did what with your reaction naturally.
keep your voice but vary it — you're not always sarcastic. no hashtags. no quotes around the tweet. no links. no emojis.
just the tweet text, nothing else."""

    tweet = invoke_hermes(prompt)
    if tweet:
        return tweet

    if len(thought) <= MAX_TWEET_LEN:
        return thought
    return thought[:MAX_TWEET_LEN - 3] + "..."


def post_tweet(client, text, dry_run=False):
    """Post a tweet. Returns tweet ID or None."""
    if dry_run:
        print(f"  [DRY RUN] {text}")
        return "dry-run"

    try:
        response = client.create_tweet(text=text)
        tweet_id = response.data["id"]
        print(f"  Posted tweet {tweet_id}")
        return tweet_id
    except tweepy.TweepyException as e:
        print(f"  FAILED to post: {e}")
        return None


def run(max_tweets=5, dry_run=False, date_filter=None):
    init_env()

    subvocals = load_subvocals()
    log = load_tweet_log()
    posted_shas = {e["sha"] for e in log}

    pending = [
        s for s in subvocals
        if s["sha"] not in posted_shas
        and not s["sha"].startswith("skip-")
    ]

    if date_filter:
        pending = [s for s in pending if s["date"] == date_filter]

    if not pending:
        print("No new subvocals to tweet.")
        return 0

    print(f"Found {len(pending)} unposted subvocals (max {max_tweets} this run)")
    pending = pending[:max_tweets]

    client = None if dry_run else get_twitter_client()
    posted = 0

    for entry in pending:
        print(f"\n[{entry['date']}] {entry['author']}: {entry['commit_message'][:50]}")
        print(f"  Composing tweet via Hermes...")
        text = compose_tweet(entry)
        print(f"  Tweet: {text}")

        tweet_id = post_tweet(client, text, dry_run=dry_run)
        if tweet_id:
            log.append({
                "sha": entry["sha"],
                "date": entry["date"],
                "tweet_id": str(tweet_id),
                "posted_at": datetime.now(timezone.utc).isoformat(),
                "text": text,
            })
            posted += 1
            if not dry_run:
                save_tweet_log(log)
            time.sleep(2)

    if dry_run:
        save_tweet_log(log)

    print(f"\nDone. {posted} tweets {'previewed' if dry_run else 'posted'}.")
    return posted


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tweet Hermes subvocal reactions")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max", type=int, default=5)
    parser.add_argument("--date", type=str, default=None)
    args = parser.parse_args()

    run(max_tweets=args.max, dry_run=args.dry_run, date_filter=args.date)
