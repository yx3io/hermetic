#!/usr/bin/env python3
"""Extract skills from daily.json and write skills.json for the web app."""

import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
DAILY_FILE = ROOT.parent / "data" / "daily.json"
OUT_FILE = ROOT / "src" / "data" / "skills.json"

SKIP_NAMES = {"DESCRIPTION", "SKILL", "__pycache__", "__init__"}


def extract():
    with open(DAILY_FILE) as f:
        data = json.load(f)

    days = data["days"]
    skill_map = {}

    for day_idx, day in enumerate(days):
        for file_entry in day.get("files", []):
            fn = file_entry["filename"]
            parts = fn.split("/")
            if len(parts) < 3:
                continue
            if parts[0] not in ("skills", "optional-skills"):
                continue

            category = parts[1]
            skill_name = parts[2]
            for ext in (".py", ".md", ".yaml", ".yml", ".json", ".txt", ".toml"):
                skill_name = skill_name.replace(ext, "")
            skill_name = skill_name.replace("_", "-")

            if skill_name in SKIP_NAMES or skill_name.startswith("."):
                continue

            key = f"{category}/{skill_name}"
            if key not in skill_map:
                skill_map[key] = {
                    "name": skill_name,
                    "category": category,
                    "firstDay": day_idx + 1,
                    "firstDate": day["date"],
                }

    cat_map = defaultdict(lambda: {"skills": set(), "firstDay": 999, "firstDate": ""})
    for entry in skill_map.values():
        cat = cat_map[entry["category"]]
        cat["skills"].add(entry["name"])
        if entry["firstDay"] < cat["firstDay"]:
            cat["firstDay"] = entry["firstDay"]
            cat["firstDate"] = entry["firstDate"]

    categories = []
    for cat_name, cat_data in cat_map.items():
        categories.append({
            "category": cat_name,
            "skills": sorted(cat_data["skills"]),
            "firstDay": cat_data["firstDay"],
            "firstDate": cat_data["firstDate"],
        })

    categories.sort(key=lambda c: (c["firstDay"], c["category"]))

    total_skills = sum(len(c["skills"]) for c in categories)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w") as f:
        json.dump({"categories": categories, "totalSkills": total_skills}, f, indent=2)

    print(f"Extracted {total_skills} skills across {len(categories)} categories -> {OUT_FILE}")


if __name__ == "__main__":
    extract()
