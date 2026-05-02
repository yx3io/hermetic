"""
Fetch all commits from NousResearch/hermes-agent and group by date.
Merges with existing release data. Produces data/daily.json.
"""

import json
import time
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import requests

REPO = "NousResearch/hermes-agent"
API_BASE = f"https://api.github.com/repos/{REPO}"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DAILY_CACHE = DATA_DIR / "daily.json"
RELEASES_CACHE = DATA_DIR / "releases.json"

SESSION = requests.Session()
import os
TOKEN = os.environ.get("GITHUB_TOKEN")
if TOKEN:
    SESSION.headers["Authorization"] = f"token {TOKEN}"
SESSION.headers["Accept"] = "application/vnd.github.v3+json"
SESSION.headers["User-Agent"] = "hermes-archaeology"


def _get(url, params=None):
    resp = SESSION.get(url, params=params)
    if resp.status_code == 403 and "rate limit" in resp.text.lower():
        reset = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
        wait = max(reset - int(time.time()), 1)
        print(f"  Rate limited. Waiting {wait}s...")
        time.sleep(wait)
        resp = SESSION.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


def fetch_all_commits(since="2026-03-01T00:00:00Z", until=None):
    """Fetch all commits in date range, paginating fully."""
    by_date = defaultdict(list)
    page = 1
    total = 0

    while page <= 30:
        print(f"  Fetching commits page {page}...")
        params = {"since": since, "per_page": 100, "page": page}
        if until:
            params["until"] = until
        batch = _get(f"{API_BASE}/commits", params=params)
        if not batch or isinstance(batch, dict):
            break
        for c in batch:
            d = c["commit"]["author"]["date"][:10]
            by_date[d].append({
                "sha": c["sha"][:8],
                "message": c["commit"]["message"].split("\n")[0][:120],
                "author": c["commit"]["author"]["name"],
            })
            total += 1
        if len(batch) < 100:
            break
        page += 1
        time.sleep(0.3)

    print(f"  Fetched {total} commits across {len(by_date)} days")
    return dict(by_date)


def build_daily_dataset(use_cache=True):
    """
    Build daily dataset: one entry per calendar day from first commit to last.
    Active days get real commit data. Silent days get an empty entry.
    Release days get release metadata merged in.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if use_cache and DAILY_CACHE.exists():
        print(f"Loading cached daily data from {DAILY_CACHE}")
        with open(DAILY_CACHE) as f:
            return json.load(f)

    # Fetch commits
    commits_by_date = fetch_all_commits()

    # Load release data
    releases_by_date = {}
    if RELEASES_CACHE.exists():
        with open(RELEASES_CACHE) as f:
            rel_data = json.load(f)
        for r in rel_data.get("releases", []):
            d = r["published_at"][:10]
            releases_by_date[d] = r

    # Build calendar
    all_dates = sorted(set(list(commits_by_date.keys()) + list(releases_by_date.keys())))
    if not all_dates:
        print("No data found!")
        return {"days": []}

    start = date.fromisoformat(all_dates[0])
    end = date.fromisoformat(all_dates[-1])

    days = []
    current = start
    idx = 0
    while current <= end:
        ds = current.isoformat()
        commits = commits_by_date.get(ds, [])
        release = releases_by_date.get(ds)

        tag = release["tag"] if release else f"day-{ds}"
        name = release.get("name", "") if release else ""
        stats = release.get("stats", {}) if release else {}
        if not stats.get("commits"):
            stats["commits"] = len(commits)

        entry = {
            "date": ds,
            "tag": tag,
            "name": name,
            "is_release": release is not None,
            "commits": commits[:30],
            "commit_count": len(commits),
            "stats": stats,
            "themes": release.get("themes", []) if release else [],
            "body_summary": release.get("body_summary", "") if release else "",
            "index": idx,
        }
        days.append(entry)
        current += timedelta(days=1)
        idx += 1

    dataset = {
        "repo": REPO,
        "generated_at": date.today().isoformat(),
        "total_days": len(days),
        "active_days": sum(1 for d in days if d["commit_count"] > 0),
        "release_days": sum(1 for d in days if d["is_release"]),
        "days": days,
    }

    with open(DAILY_CACHE, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"\nSaved {len(days)} daily entries to {DAILY_CACHE}")
    print(f"  Active: {dataset['active_days']}, Releases: {dataset['release_days']}, Silent: {len(days) - dataset['active_days']}")

    return dataset


if __name__ == "__main__":
    data = build_daily_dataset(use_cache=False)
    for d in data["days"]:
        marker = "R" if d["is_release"] else ("." if d["commit_count"] > 0 else " ")
        print(f"  {marker} {d['date']}  {d['tag']:20s}  commits={d['commit_count']}")
