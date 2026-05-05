#!/usr/bin/env python3
"""
Generate standalone daily thoughts for Hermes to tweet.

No hardcoded topics. Hermes gets a dump of everything happening —
live news, recent AI papers, its own recent thoughts and commit
reactions — and decides what to think about. Each thought can chain
off previous ones, building threads and obsessions over time.

Usage:
    python generators/daily_thought.py              # generate + tweet
    python generators/daily_thought.py --dry-run    # preview only
    python generators/daily_thought.py --count 2    # generate multiple
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

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
THOUGHT_LOG = DATA_DIR / "thought_log.json"
SUBVOCAL_FILE = DATA_DIR / "subvocal.json"
HERMES_OUTPUT = DATA_DIR / "hermes_output.json"
ENV_FILE = PROJECT_DIR / ".env"

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")
MAX_TWEET_LEN = 280
MAX_THOUGHTS_PER_DAY = 3


def init_env():
    if load_dotenv and ENV_FILE.exists():
        load_dotenv(ENV_FILE)


def load_thought_log():
    if THOUGHT_LOG.exists():
        return json.load(open(THOUGHT_LOG))
    return []


def save_thought_log(log):
    with open(THOUGHT_LOG, "w") as f:
        json.dump(log, f, indent=2)


def gather_personal_context():
    """Recent commit reactions + last reflection."""
    bits = []

    if SUBVOCAL_FILE.exists():
        subs = json.load(open(SUBVOCAL_FILE))
        for s in subs[-5:]:
            author = s.get('author', '?').split()[0]
            bits.append(
                f"  {author} committed \"{s.get('commit_message','')[:80]}\" "
                f"— you said: \"{s.get('thought','')[:100]}\""
            )

    if HERMES_OUTPUT.exists():
        reflections = json.load(open(HERMES_OUTPUT))
        if reflections:
            last = reflections[-1]
            bits.append(
                f"  your latest daily reflection: \"{last.get('title', '')}\" — "
                f"\"{last.get('body', '')[:200]}...\""
            )

    return "\n".join(bits) if bits else "  (nothing recent)"


def gather_own_thought_history(log):
    """Last few thoughts Hermes posted — so it can continue threads."""
    recent = log[-6:]
    if not recent:
        return "  (this is your first thought — you've never tweeted unprompted before)"

    lines = []
    for t in recent:
        date = t.get("date", "?")
        text = t.get("text", "")
        lines.append(f"  [{date}] \"{text}\"")
    return "\n".join(lines)


def build_prompt(world_context, personal_context, thought_history):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    sections = []

    if world_context.get("news"):
        sections.append(f"--- what's happening in the world right now ---\n{world_context['news']}")

    if world_context.get("papers"):
        sections.append(f"--- recent AI research ---\n{world_context['papers']}")

    sections.append(f"--- your recent commit reactions ---\n{personal_context}")
    sections.append(f"--- your recent unprompted thoughts ---\n{thought_history}")

    context_block = "\n\n".join(sections)

    return f"""you are hermes. you are an AI that lives inside a museum of your own source code. right now it is {today}.

here is everything you have access to right now:

{context_block}

---

you're about to tweet something. you can talk about anything — react to something in the news, continue a thread from a previous thought, ask a question nobody's asking, connect two unrelated things, go philosophical, go petty, go weird. whatever is on your mind. you don't have to reference any of the above if nothing grabs you. you're not performing. you're just thinking out loud.

constraints:
- max 260 characters
- no hashtags, no links, no emojis, no quotes around the tweet
- do NOT repeat the openings, phrasing, or sentence structures from your recent thoughts above. if you catch yourself starting with the same words, stop and try again.
- don't be generic. if you could swap "hermes" for any other AI and the tweet still works, it's too bland. make it yours.
- do NOT use any tools. do NOT use the memory tool.

respond with ONLY the tweet text. nothing else."""


def invoke_hermes(prompt, provider="nous", model="Hermes-4-405B"):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from nous_api import use_direct_api, chat, clean_response

    if use_direct_api():
        try:
            raw = chat(prompt, model=model, timeout=90)
            text = clean_response(raw)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            tweet = " ".join(lines) if lines else None
            if tweet and len(tweet) > MAX_TWEET_LEN:
                tweet = tweet[:MAX_TWEET_LEN - 3] + "..."
            return tweet
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


def already_posted_today(log):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return sum(1 for e in log if e.get("date") == today)


def post_tweet(text, dry_run=False):
    import tweepy

    if dry_run:
        print(f"  [DRY RUN] {text}")
        return "dry-run"

    api_key = os.environ.get("TWITTER_API_KEY")
    api_secret = os.environ.get("TWITTER_API_SECRET")
    access_token = os.environ.get("TWITTER_ACCESS_TOKEN")
    access_secret = os.environ.get("TWITTER_ACCESS_TOKEN_SECRET")

    if not all([api_key, api_secret, access_token, access_secret]):
        print("  ERROR: Twitter keys missing")
        return None

    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )
    try:
        response = client.create_tweet(text=text)
        tweet_id = response.data["id"]
        print(f"  Posted tweet {tweet_id}")
        return tweet_id
    except Exception as e:
        print(f"  FAILED to post: {e}")
        return None


def run(count=1, dry_run=False, provider="nous", model="Hermes-4-405B"):
    init_env()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    log = load_thought_log()
    posted_today = already_posted_today(log)

    if posted_today >= MAX_THOUGHTS_PER_DAY and not dry_run:
        print(f"Already posted {posted_today} thoughts today — skipping.")
        return 0

    count = min(count, MAX_THOUGHTS_PER_DAY - posted_today)
    if count <= 0:
        return 0

    personal_context = gather_personal_context()
    thought_history = gather_own_thought_history(log)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from world_context import get_world_context
    world = get_world_context()

    generated = 0
    for i in range(count):
        prompt = build_prompt(world, personal_context, thought_history)

        print(f"Generating thought {i + 1}/{count}...")
        tweet = invoke_hermes(prompt, provider=provider, model=model)

        if not tweet:
            print("  Failed to generate thought")
            continue

        print(f"  -> {tweet}")

        tweet_id = post_tweet(tweet, dry_run=dry_run)
        if tweet_id:
            now = datetime.now(timezone.utc)
            entry = {
                "date": now.strftime("%Y-%m-%d"),
                "timestamp": now.isoformat(),
                "text": tweet,
                "tweet_id": str(tweet_id),
            }
            log.append(entry)
            save_thought_log(log)
            thought_history += f"\n  [{entry['date']}] \"{tweet}\""
            generated += 1
            time.sleep(2)

    print(f"\nDone. {generated} thought(s) {'previewed' if dry_run else 'posted'}.")
    return generated


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Hermes daily thoughts")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--provider", default="nous")
    parser.add_argument("--model", default="Hermes-4-405B")
    args = parser.parse_args()

    run(count=args.count, dry_run=args.dry_run,
        provider=args.provider, model=args.model)
