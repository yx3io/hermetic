#!/usr/bin/env python3
"""
Seed the SQLite database from daily artifacts, commit data, and real Hermes reflections.
"""

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "museum.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
ARTIFACTS_REGISTRY = ROOT / "public" / "artifacts" / "artifacts.json"
ARTIFACTS_DIR = ROOT / "public" / "artifacts"
DAILY_DATA = ROOT.parent / "data" / "daily.json"
HERMES_OUTPUT = ROOT.parent / "data" / "hermes_output.json"


def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)
    return conn


def load_data():
    registry = json.loads(ARTIFACTS_REGISTRY.read_text())
    daily = json.loads(DAILY_DATA.read_text())
    days_by_date = {d["date"]: d for d in daily["days"]}

    hermes = {}
    if HERMES_OUTPUT.exists():
        hermes_data = json.loads(HERMES_OUTPUT.read_text())
        hermes = {h["date"]: h for h in hermes_data}
        print(f"  Loaded {len(hermes)} Hermes reflections")
    else:
        print("  WARNING: No hermes_output.json found — using fallback reflections")

    return registry["artifacts"], days_by_date, hermes


def fallback_reflection(day):
    """Simple fallback if Hermes output is unavailable."""
    date = day.get("date", "unknown")
    commit_count = day.get("commit_count", 0)
    if commit_count == 0:
        return f"{date}.\nnothing happened. i rendered it anyway.\npending."
    return f"{date}.\n{commit_count} changes arrived.\ni read through them.\npending."


def build_dossier(day):
    commits = day.get("commits", [])
    commits_read = [
        {"sha": c.get("sha", ""), "message": c.get("message", ""), "author": c.get("author", "")}
        for c in commits[:20]
    ]
    themes = day.get("themes", []) or ["daily"]
    process_notes = (
        f"consumed {len(commits_read)} specimens. "
        f"dominant signals: {', '.join(themes)}. "
        f"rendered in one pass."
    )
    return {
        "commits_read": commits_read,
        "skills_invented": [],
        "skills_used": [],
        "references_pulled": [],
        "process_notes": process_notes,
        "iterations": 1,
    }


def seed():
    conn = init_db()
    artifacts, days_by_date, hermes = load_data()

    conn.execute("DELETE FROM invented_skills")
    conn.execute("DELETE FROM creation_dossiers")
    conn.execute("DELETE FROM memory_snapshots")
    conn.execute("DELETE FROM artifacts")

    total = len(artifacts)
    print(f"Seeding {total} artifacts...")

    for i, art in enumerate(artifacts):
        date = art["date"][:10]
        tag = art["tag"]
        day = days_by_date.get(date, {"date": date, "tag": tag, "commits": [], "commit_count": 0})

        html_path = ARTIFACTS_DIR / art["filename"]
        source_code = html_path.read_text() if html_path.exists() else ""

        # Use real Hermes reflection if available
        h = hermes.get(date)
        if h and h.get("reflection") and not h["reflection"].startswith("["):
            title = h.get("title", "")
            reflection = h["reflection"]
            memory_md = h.get("memory_md", "")
            capacity = h.get("memory_capacity_pct", 0)
            entries_count = len([l for l in memory_md.split("§") if l.strip()]) if memory_md else 0
        else:
            title = ""
            reflection = fallback_reflection(day)
            memory_md = ""
            capacity = 0
            entries_count = 0

        dossier = build_dossier(day)
        commits = day.get("commits", [])
        stats = day.get("stats", {})

        conn.execute(
            """INSERT INTO artifacts
               (date, tag, commits, render_format, source_code, filename,
                title, reflection, aesthetic_used, release_name, stats)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                date,
                tag,
                json.dumps(commits[:20]),
                "html",
                source_code,
                art["filename"],
                title,
                reflection,
                json.dumps(["p5_composition"]),
                art.get("release_name", tag),
                json.dumps(stats),
            ),
        )
        artifact_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            """INSERT INTO memory_snapshots
               (artifact_id, memory_md, capacity_used_pct, entries_count)
               VALUES (?, ?, ?, ?)""",
            (artifact_id, memory_md, capacity, entries_count),
        )

        conn.execute(
            """INSERT INTO creation_dossiers
               (artifact_id, commits_read, skills_invented, skills_used,
                references_pulled, process_notes, iterations)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                artifact_id,
                json.dumps(dossier["commits_read"]),
                json.dumps(dossier["skills_invented"]),
                json.dumps(dossier["skills_used"]),
                json.dumps(dossier["references_pulled"]),
                dossier["process_notes"],
                dossier["iterations"],
            ),
        )

        source = "H" if h and h.get("reflection") and not h["reflection"].startswith("[") else "F"
        marker = "R" if day.get("is_release") else "."
        print(f"  [{i+1}/{total}] {marker}{source} {date} {tag} — memory: {capacity}%")

    conn.commit()
    conn.close()
    print(f"\nDone. {total} artifacts seeded to {DB_PATH}")


if __name__ == "__main__":
    seed()
