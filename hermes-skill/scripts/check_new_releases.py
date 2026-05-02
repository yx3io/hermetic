#!/usr/bin/env python3
"""
Cron pre-script: check if there are new Hermes Agent releases
that don't have corresponding artifacts yet.

stdout is passed to the Hermes cron agent as context.
"""

import json
import os
import sys
from pathlib import Path

import requests

REPO = "NousResearch/hermes-agent"
API_URL = f"https://api.github.com/repos/{REPO}/releases"

PROJECT_DIR = os.environ.get(
    "ARCHAEOLOGY_PROJECT_DIR",
    str(Path.home() / "Documents" / "hermesy"),
)
REGISTRY_FILE = Path(PROJECT_DIR) / "website" / "artifacts" / "artifacts.json"


def main():
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    try:
        resp = requests.get(API_URL, headers=headers, params={"per_page": 30})
        resp.raise_for_status()
        releases = resp.json()
    except Exception as e:
        print(f"ERROR: Failed to fetch releases: {e}")
        sys.exit(1)

    release_tags = {r["tag_name"] for r in releases}

    existing_tags = set()
    if REGISTRY_FILE.exists():
        try:
            with open(REGISTRY_FILE) as f:
                registry = json.load(f)
            existing_tags = {a["tag"] for a in registry.get("artifacts", [])}
        except Exception:
            pass

    new_tags = release_tags - existing_tags

    if new_tags:
        sorted_new = sorted(new_tags)
        print(f"NEW_RELEASES_DETECTED: {len(new_tags)} new release(s)")
        for tag in sorted_new:
            rel = next(r for r in releases if r["tag_name"] == tag)
            print(f"  - {tag} (published {rel['published_at'][:10]})")
        print(f"\nProject directory: {PROJECT_DIR}")
        print("Run: cd {PROJECT_DIR} && rm data/releases.json && python3 generators/orchestrator.py")
    else:
        print("[SILENT]")


if __name__ == "__main__":
    main()
