#!/usr/bin/env python3
"""Generate verdicts in batch via a single hermes call."""
import json
import subprocess
import sqlite3

DB = "/Users/yyy/Documents/aaaaaaaa/hermetic/web/db/museum.db"

conn = sqlite3.connect(DB)
rows = conn.execute("SELECT id, date, title FROM artifacts ORDER BY date").fetchall()

# Build one big prompt asking for all verdicts at once
titles_list = "\n".join(f"{row[0]}|{row[1]}|{row[2]}" for row in rows)

prompt = f"""here are 53 daily reflection titles from hermes examining its own source code.
for each one, write a short sarcastic/funny verdict (1-5 words, lowercase, no period).
these appear as tiny annotations under each reflection on a website.

they should be varied — witty, dry, petty, fond, dismissive, amused. mix it up.
examples: "who asked", "not my problem", "sure jan", "bold move", "they tried", "oh well", "noted", "fair enough", "classic", "peak chaos"

respond with ONLY the lines in format: ID|verdict
nothing else. no explanation.

{titles_list}"""

cmd = ["hermes", "chat", "-q", prompt, "--provider", "nous", "-m", "Hermes-4-405B", "-Q"]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
output = result.stdout.strip()

print("Raw output:")
print(output[:500])
print("---")

# Parse
updated = 0
for line in output.strip().splitlines():
    line = line.strip()
    if "|" not in line:
        continue
    parts = line.split("|", 1)
    if len(parts) != 2:
        continue
    try:
        art_id = int(parts[0].strip())
    except ValueError:
        continue
    verdict = parts[1].strip().strip('"').strip("'").rstrip(".")
    if len(verdict) > 40 or len(verdict) < 2:
        continue
    
    conn.execute("UPDATE artifacts SET verdict = ? WHERE id = ?", (verdict, art_id))
    updated += 1
    print(f"  {art_id}: {verdict}")

conn.commit()
conn.close()
print(f"\nUpdated {updated} verdicts")
