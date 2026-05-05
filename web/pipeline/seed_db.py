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
IMAGE_OUTPUT = ROOT.parent / "data" / "image_artifacts.json"


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

    images = {}
    if IMAGE_OUTPUT.exists():
        image_data = json.loads(IMAGE_OUTPUT.read_text())
        images = {img["date"]: img for img in image_data}
        print(f"  Loaded {len(images)} image artifacts")
    else:
        print("  WARNING: No image_artifacts.json found — no FAL images")

    return registry["artifacts"], days_by_date, hermes, images


def fallback_reflection(day):
    """Simple fallback if Hermes output is unavailable."""
    date = day.get("date", "unknown")
    commit_count = day.get("commit_count", 0)
    if commit_count == 0:
        return f"{date}.\nnothing happened. i rendered it anyway.\npending."
    return f"{date}.\n{commit_count} changes arrived.\ni read through them.\npending."


SKILLS_JSON = ROOT / "src" / "data" / "skills.json"

def _load_skills_by_date():
    """Build a map: date -> list of skill names available by that date."""
    if not SKILLS_JSON.exists():
        return {}
    data = json.loads(SKILLS_JSON.read_text())
    categories = data.get("categories", [])
    result = {}
    for cat in categories:
        first_date = cat.get("firstDate", "")
        skills = cat.get("skills", [])
        if first_date and skills:
            result[first_date] = skills
    return result

_SKILLS_BY_DATE = _load_skills_by_date()

def get_skills_available_on(date: str) -> list[str]:
    """Return all skill names that existed by a given date."""
    available = ["hermetic-museum"]
    for first_date, skills in _SKILLS_BY_DATE.items():
        if first_date <= date:
            available.extend(skills[:2])
    return list(dict.fromkeys(available))


def build_dossier(day, date: str):
    commits = day.get("commits", [])
    commits_read = [
        {"sha": c.get("sha", ""), "message": c.get("message", ""), "author": c.get("author", "")}
        for c in commits[:20]
    ]
    themes = day.get("themes", []) or ["daily"]

    skills_used = get_skills_available_on(date)

    process_notes = (
        f"consumed {len(commits_read)} specimens. "
        f"dominant signals: {', '.join(themes)}. "
        f"skills loaded: {', '.join(skills_used[:4])}. "
        f"rendered in one pass."
    )
    return {
        "commits_read": commits_read,
        "skills_invented": [],
        "skills_used": skills_used,
        "references_pulled": [],
        "process_notes": process_notes,
        "iterations": 1,
    }


def _collect_all_dates(artifacts, hermes, days_by_date):
    """Merge artifact registry dates with hermes_output dates so new days are never skipped."""
    art_dates = {a["date"][:10] for a in artifacts}
    hermes_dates = set(hermes.keys())
    all_dates = sorted(art_dates | hermes_dates)

    art_by_date = {a["date"][:10]: a for a in artifacts}
    entries = []
    for date in all_dates:
        art = art_by_date.get(date)
        day = days_by_date.get(date, {"date": date, "tag": f"day-{date}", "commits": [], "commit_count": 0})
        tag = art["tag"] if art else day.get("tag", f"day-{date}")
        filename = art["filename"] if art else f"{date}_p5.html"
        release_name = art.get("release_name", tag) if art else tag
        entries.append({
            "date": date,
            "tag": tag,
            "filename": filename,
            "release_name": release_name,
            "has_artifact": art is not None,
        })
    return entries


def seed():
    conn = init_db()
    artifacts, days_by_date, hermes, images = load_data()

    conn.execute("DELETE FROM invented_skills")
    conn.execute("DELETE FROM creation_dossiers")
    conn.execute("DELETE FROM memory_snapshots")
    conn.execute("DELETE FROM artifacts")

    entries = _collect_all_dates(artifacts, hermes, days_by_date)
    total = len(entries)
    print(f"Seeding {total} artifacts...")

    for i, entry in enumerate(entries):
        date = entry["date"]
        tag = entry["tag"]
        day = days_by_date.get(date, {"date": date, "tag": tag, "commits": [], "commit_count": 0})

        html_path = ARTIFACTS_DIR / entry["filename"]
        source_code = html_path.read_text() if html_path.exists() else ""

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

        dossier = build_dossier(day, date)
        commits = day.get("commits", [])
        stats = day.get("stats", {})

        img = images.get(date, {})
        image_filename = img.get("image_filename", "")
        style_ref_image = img.get("style_ref_image", "")

        conn.execute(
            """INSERT INTO artifacts
               (date, tag, commits, render_format, source_code, filename,
                title, reflection, aesthetic_used, release_name, stats,
                image_filename, image_prompt, style_ref_image)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                date,
                tag,
                json.dumps(commits[:20]),
                "html",
                source_code,
                entry["filename"],
                title,
                reflection,
                json.dumps(["p5_composition"]),
                entry["release_name"],
                json.dumps(stats),
                image_filename,
                "",
                style_ref_image,
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
