"""
Orchestrator: generate one artifact per day from daily.json.
p5.js composable layers — three style directions selected by day hash.
"""

import hashlib
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generators.p5_generator import generate as gen_p5

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "artifacts"
REGISTRY_FILE = ARTIFACTS_DIR / "artifacts.json"
DAILY_FILE = Path(__file__).resolve().parent.parent / "data" / "daily.json"


def make_release_from_day(day):
    """Convert a daily entry into the release dict that generators expect."""
    files = day.get("files", [])
    commits = day.get("commits", [])
    for c in commits:
        if "date" not in c:
            c["date"] = day["date"] + "T00:00:00Z"
    return {
        "tag": day["tag"],
        "name": day.get("name", ""),
        "published_at": day["date"] + "T00:00:00Z",
        "stats": day.get("stats", {}),
        "commits_sample": commits,
        "compare": {"files": files, "total_commits": day.get("commit_count", 0), "ahead_by": 0},
        "themes": day.get("themes", []),
        "body_summary": day.get("body_summary", ""),
    }


def generate_artifact(day):
    """Generate a single artifact for a day, write HTML file, return metadata."""
    release = make_release_from_day(day)

    html_content, meta = gen_p5(release)

    date_slug = day["date"]
    filename = f"{date_slug}_p5.html"
    filepath = ARTIFACTS_DIR / filename

    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        f.write(html_content)

    meta["filename"] = filename
    meta["file_size"] = len(html_content)
    meta["date"] = day["date"]
    meta["type"] = "p5_composition"
    meta["is_release"] = day.get("is_release", False)
    meta["commit_count"] = day.get("commit_count", 0)
    return meta


def generate_all():
    """Generate artifacts for all days."""
    if not DAILY_FILE.exists():
        print(f"ERROR: {DAILY_FILE} not found. Run fetch_daily.py first.")
        sys.exit(1)

    with open(DAILY_FILE) as f:
        dataset = json.load(f)

    days = dataset["days"]
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    all_artifacts = []
    for i, day in enumerate(days):
        meta = generate_artifact(day)
        all_artifacts.append(meta)
        print(f"  [{i+1}/{len(days)}] {day['date']}  p5_composition")

    all_artifacts.sort(key=lambda a: a.get("date", ""))

    registry = {
        "generated_at": dataset.get("generated_at", ""),
        "repo": dataset.get("repo", ""),
        "total_artifacts": len(all_artifacts),
        "artifacts": all_artifacts,
    }

    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2)

    print(f"\nGenerated {len(all_artifacts)} artifacts")
    return registry


if __name__ == "__main__":
    if ARTIFACTS_DIR.exists():
        for f in ARTIFACTS_DIR.glob("*.html"):
            f.unlink()
        print("Cleared existing artifacts")

    registry = generate_all()
    for a in registry["artifacts"]:
        print(f"  {a['date']}  {a['type']:25s}  {a['filename']}")
