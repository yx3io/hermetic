"""
Regenerate 5 specific timeline artifacts using the new P5 styles.
Run from project root: python -m generators.regen_preview
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generators.orchestrator import make_release_from_day, ARTIFACTS_DIR
from generators.p5_generator import generate as gen_p5

DAILY_FILE = Path(__file__).resolve().parent.parent / "data" / "daily.json"

TARGETS = {
    "2026-03-28": 10,  # AI Detection HUD
    "2026-04-03": 11,  # Scattered Text
    "2026-04-10": 12,  # Trial3 Bold Typography
    "2026-04-15": 13,  # Contour Shapes
    "2026-04-25": 14,  # Geo Data
}


def main():
    if not DAILY_FILE.exists():
        print(f"ERROR: {DAILY_FILE} not found.")
        sys.exit(1)

    with open(DAILY_FILE) as f:
        dataset = json.load(f)

    days_by_date = {d["date"]: d for d in dataset["days"]}
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    for date, mode in TARGETS.items():
        day = days_by_date.get(date)
        if not day:
            print(f"  SKIP {date} — not found in daily.json")
            continue

        release = make_release_from_day(day)
        html_content, meta = gen_p5(release, mode=mode)

        filename = f"{date}_p5.html"
        filepath = ARTIFACTS_DIR / filename
        with open(filepath, "w") as f:
            f.write(html_content)

        size_kb = len(html_content) / 1024
        print(f"  OK  {date}  mode={mode}  {size_kb:.1f}KB  → {filename}")

    print("\nDone. Preview the artifacts in web/public/artifacts/")


if __name__ == "__main__":
    main()
