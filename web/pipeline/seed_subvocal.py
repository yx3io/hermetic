#!/usr/bin/env python3
"""Seed subvocal thoughts into the SQLite database."""

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "museum.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
SUBVOCAL_DATA = ROOT.parent / "data" / "subvocal.json"


def seed():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)

    if not SUBVOCAL_DATA.exists():
        print("No subvocal.json found — nothing to seed.")
        return

    data = json.loads(SUBVOCAL_DATA.read_text())
    print(f"Seeding {len(data)} subvocal thoughts...")

    conn.execute("DELETE FROM subvocals")

    for entry in data:
        conn.execute(
            """INSERT INTO subvocals (sha, date, timestamp, author, commit_message, thought)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                entry["sha"],
                entry["date"],
                entry["timestamp"],
                entry.get("author", ""),
                entry.get("commit_message", ""),
                entry["thought"],
            ),
        )

    conn.commit()
    conn.close()
    print(f"Done. {len(data)} thoughts seeded to {DB_PATH}")


if __name__ == "__main__":
    seed()
