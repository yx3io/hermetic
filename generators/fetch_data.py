"""
Fetch Hermes Agent release and commit data from GitHub API.
Caches results to data/releases.json to avoid repeated API calls.
"""

import json
import os
import time
from pathlib import Path
from datetime import datetime

import requests

REPO = "NousResearch/hermes-agent"
API_BASE = f"https://api.github.com/repos/{REPO}"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_FILE = DATA_DIR / "releases.json"

SESSION = requests.Session()
TOKEN = os.environ.get("GITHUB_TOKEN")
if TOKEN:
    SESSION.headers["Authorization"] = f"token {TOKEN}"
SESSION.headers["Accept"] = "application/vnd.github.v3+json"
SESSION.headers["User-Agent"] = "hermes-archaeology-museum"


def _get(url, params=None):
    """Rate-limit-aware GET."""
    resp = SESSION.get(url, params=params)
    if resp.status_code == 403 and "rate limit" in resp.text.lower():
        reset = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
        wait = max(reset - int(time.time()), 1)
        print(f"  Rate limited. Waiting {wait}s...")
        time.sleep(wait)
        resp = SESSION.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


def fetch_releases():
    """Return list of releases sorted by date (oldest first)."""
    print("Fetching releases...")
    releases = _get(f"{API_BASE}/releases", params={"per_page": 30})
    out = []
    for r in releases:
        out.append({
            "tag": r["tag_name"],
            "name": r.get("name", r["tag_name"]),
            "published_at": r["published_at"],
            "body": r.get("body", ""),
            "html_url": r["html_url"],
            "author": r["author"]["login"] if r.get("author") else "unknown",
        })
    out.sort(key=lambda x: x["published_at"])
    return out


def fetch_commits_between(since, until, max_pages=5):
    """Fetch commits between two ISO timestamps."""
    commits = []
    page = 1
    while page <= max_pages:
        batch = _get(f"{API_BASE}/commits", params={
            "since": since,
            "until": until,
            "per_page": 100,
            "page": page,
        })
        if not batch:
            break
        for c in batch:
            commits.append({
                "sha": c["sha"][:8],
                "message": c["commit"]["message"].split("\n")[0][:120],
                "author": c["commit"]["author"]["name"],
                "date": c["commit"]["author"]["date"],
            })
        if len(batch) < 100:
            break
        page += 1
    return commits


def fetch_compare(base_tag, head_tag):
    """Fetch comparison between two tags. Returns file-level stats."""
    print(f"  Comparing {base_tag}...{head_tag}")
    try:
        data = _get(f"{API_BASE}/compare/{base_tag}...{head_tag}")
    except requests.HTTPError:
        return {"files": [], "total_commits": 0, "ahead_by": 0}

    files = []
    for f in data.get("files", [])[:500]:
        files.append({
            "filename": f["filename"],
            "status": f["status"],
            "additions": f["additions"],
            "deletions": f["deletions"],
            "changes": f["changes"],
        })
    return {
        "files": files,
        "total_commits": data.get("total_commits", 0),
        "ahead_by": data.get("ahead_by", 0),
    }


def _extract_stats_from_body(body):
    """Pull rough numeric stats from release body markdown."""
    import re
    stats = {}
    for pattern, key in [
        (r"([\d,]+)\s+commits?", "commits"),
        (r"([\d,]+)\s+merged\s+PRs?", "merged_prs"),
        (r"([\d,]+)\s+files?\s+changed", "files_changed"),
        (r"([\d,]+)\s+insertions?", "insertions"),
        (r"([\d,]+)\s+contributors?", "contributors"),
        (r"([\d,]+)\s+resolved\s+issues?", "resolved_issues"),
    ]:
        m = re.search(pattern, body, re.IGNORECASE)
        if m:
            stats[key] = int(m.group(1).replace(",", ""))
    return stats


def _classify_release(release_data):
    """Heuristic classification of release theme for artifact type selection."""
    body = release_data.get("body", "").lower()
    tag = release_data.get("tag", "")
    files = release_data.get("compare", {}).get("files", [])

    file_statuses = [f["status"] for f in files]
    added_count = file_statuses.count("added")
    modified_count = file_statuses.count("modified")
    removed_count = file_statuses.count("removed")
    total_churn = sum(f["changes"] for f in files)

    themes = []

    if added_count > len(files) * 0.4:
        themes.append("new_modules")
    if any(kw in body for kw in ["bug", "fix", "patch", "hotfix", "breaking"]):
        themes.append("bugfix")
    if any(kw in body for kw in ["refactor", "architect", "rewrite", "migration"]):
        themes.append("architecture")
    if total_churn > 50000 or modified_count > 100:
        themes.append("high_churn")
    if any(kw in body for kw in ["cli", "terminal", "tui", "shell", "infrastructure"]):
        themes.append("infrastructure")
    if any(kw in body for kw in ["contributor", "community", "growth", "milestone"]):
        themes.append("growth")

    if not themes:
        themes.append("general")

    return themes


def build_full_dataset(use_cache=True):
    """Build the complete dataset for all releases."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if use_cache and CACHE_FILE.exists():
        print(f"Loading cached data from {CACHE_FILE}")
        with open(CACHE_FILE) as f:
            return json.load(f)

    releases = fetch_releases()
    print(f"Found {len(releases)} releases")

    enriched = []
    for i, rel in enumerate(releases):
        print(f"\nProcessing release {i+1}/{len(releases)}: {rel['tag']}")

        rel["stats"] = _extract_stats_from_body(rel["body"])

        if i > 0:
            prev_tag = releases[i - 1]["tag"]
            rel["compare"] = fetch_compare(prev_tag, rel["tag"])
        else:
            since = "2025-07-01T00:00:00Z"
            rel["compare"] = {
                "files": [],
                "total_commits": rel["stats"].get("commits", 0),
                "ahead_by": 0,
            }
            commits = fetch_commits_between(since, rel["published_at"], max_pages=2)
            rel["commits_sample"] = commits[:50]

        if "commits_sample" not in rel:
            prev_date = releases[i - 1]["published_at"] if i > 0 else "2025-07-01T00:00:00Z"
            rel["commits_sample"] = fetch_commits_between(
                prev_date, rel["published_at"], max_pages=2
            )[:50]

        rel["themes"] = _classify_release(rel)

        body_lines = rel["body"].split("\n")
        rel["body_summary"] = "\n".join(body_lines[:40])
        if len(body_lines) > 40:
            rel["body_summary"] += "\n..."
        del rel["body"]

        enriched.append(rel)
        time.sleep(0.5)

    dataset = {
        "repo": REPO,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "releases": enriched,
    }

    with open(CACHE_FILE, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"\nSaved to {CACHE_FILE}")

    return dataset


if __name__ == "__main__":
    data = build_full_dataset(use_cache=False)
    print(f"\nDone: {len(data['releases'])} releases processed")
    for r in data["releases"]:
        n_files = len(r.get("compare", {}).get("files", []))
        print(f"  {r['tag']:20s}  {r['published_at'][:10]}  "
              f"files={n_files:4d}  themes={r['themes']}")
