#!/usr/bin/env python3
"""
Generate landscape images for each day using Hermes Agent + FAL AI.

Picks a visual style prompt from data/style_prompts.json, blends it with the
day's reflection, and has Hermes Agent call image_generate.

Usage:
    python generators/image_generator.py                    # all days
    python generators/image_generator.py --day 2026-03-15   # single day
    python generators/image_generator.py --days 5           # first N days
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
HERMES_OUTPUT = PROJECT_DIR / "data" / "hermes_output.json"
IMAGE_OUTPUT = PROJECT_DIR / "data" / "image_artifacts.json"
STYLE_PROMPTS = PROJECT_DIR / "data" / "style_prompts.json"
ARTIFACTS_DIR = PROJECT_DIR / "web" / "public" / "artifacts"

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")
MAX_RETRIES = 2


def load_reflections():
    """Load hermes_output.json (must exist — run hermes_reflect_agent.py first)."""
    if not HERMES_OUTPUT.exists():
        print(f"ERROR: {HERMES_OUTPUT} not found. Run hermes_reflect_agent.py first.")
        sys.exit(1)
    with open(HERMES_OUTPUT) as f:
        data = json.load(f)
    return {entry["date"]: entry for entry in data}


def load_style_prompts():
    if not STYLE_PROMPTS.exists():
        print(f"ERROR: {STYLE_PROMPTS} not found.")
        sys.exit(1)
    with open(STYLE_PROMPTS) as f:
        prompts = json.load(f)
    if not prompts:
        print("ERROR: style_prompts.json is empty.")
        sys.exit(1)
    return prompts


def load_existing_images():
    if IMAGE_OUTPUT.exists():
        with open(IMAGE_OUTPUT) as f:
            return json.load(f)
    return []


def save_images(results):
    with open(IMAGE_OUTPUT, "w") as f:
        json.dump(results, f, indent=2)


def get_style_prompt(day_index, prompts):
    """Deterministic prompt selection: day_index mod len(prompts)."""
    return day_index % len(prompts), prompts[day_index % len(prompts)]


def build_image_prompt(reflection_entry, style_prompt):
    """Build a prompt that blends the day's reflection with a visual style."""
    date = reflection_entry["date"]
    title = reflection_entry.get("title", "")
    reflection = reflection_entry.get("reflection", "")

    if len(reflection) > 500:
        reflection = reflection[:500] + "..."

    return (
        f"You are generating a landscape artwork for a digital museum ({date}).\n"
        f"The artwork should capture the emotional essence of this day's reflection "
        f"while following the visual style described.\n\n"
        f"=== TODAY'S REFLECTION (use its emotional tone, themes, and imagery as inspiration) ===\n"
        f'Title: "{title}"\n'
        f"{reflection}\n\n"
        f"=== VISUAL STYLE (follow this closely for colors, composition, texture) ===\n"
        f"{style_prompt}\n\n"
        f"Blend the reflection's emotional themes into the visual style. "
        f'Then call image_generate with your blended prompt and aspect_ratio="landscape". '
        f"Respond with ONLY the image URL, nothing else."
    )


def invoke_hermes_for_image(prompt):
    """Call Hermes Agent CLI or FAL API (in CI) to generate an image."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from nous_api import use_direct_api, generate_image

    if use_direct_api():
        # Strip the agent instruction — FAL just needs the descriptive prompt
        clean_prompt = prompt.split("Then call image_generate")[0].strip()
        # Also strip the "Blend the reflection's" instruction if present
        clean_prompt = clean_prompt.split("Blend the reflection's")[0].strip()
        if not clean_prompt:
            clean_prompt = prompt[:500]
        url = generate_image(clean_prompt, aspect_ratio="landscape")
        return url  # Returns URL directly

    cmd = [HERMES_CLI, "chat", "-q", prompt, "-Q"]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
            env=os.environ.copy(),
            cwd=str(PROJECT_DIR),
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            raise RuntimeError(f"hermes exited {result.returncode}: {stderr[:500]}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        raise RuntimeError("hermes timed out after 180 seconds")


def extract_image_location(raw_output):
    """Extract the image URL or file path from agent output."""
    for line in raw_output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("http://") or line.startswith("https://"):
            if any(ext in line.lower() for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return line
        if line.startswith("/") and any(line.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            return line
        for part in line.split():
            if part.startswith("http") and any(ext in part.lower() for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return part
    return None


def save_image_to_artifacts(location, date):
    """Download (if URL) or copy (if local) image to web/public/artifacts/."""
    import shutil
    import urllib.request

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    if location.startswith("http://") or location.startswith("https://"):
        ext = ".png"
        for candidate in [".png", ".jpg", ".jpeg", ".webp"]:
            if candidate in location.lower():
                ext = candidate
                break
        dest_name = f"{date}_fal{ext}"
        dest = ARTIFACTS_DIR / dest_name
        try:
            urllib.request.urlretrieve(location, str(dest))
            return dest_name
        except Exception as e:
            print(f"    download error: {e}")
            return None
    else:
        src = Path(location)
        if not src.exists():
            return None
        dest_name = f"{date}_fal{src.suffix}"
        dest = ARTIFACTS_DIR / dest_name
        shutil.copy2(src, dest)
        return dest_name


def run(max_days=None, single_day=None, dry_run=False):
    reflections = load_reflections()
    style_prompts = load_style_prompts()
    results = load_existing_images()
    completed_dates = {r["date"] for r in results}

    dates = sorted(reflections.keys())

    if single_day:
        dates = [single_day] if single_day in reflections else []
        if not dates:
            print(f"ERROR: no reflection found for {single_day}")
            sys.exit(1)
    elif max_days:
        dates = dates[:max_days]

    print(f"Image generator (prompt bank: {len(style_prompts)} styles)")
    print(f"  Days to process: {len(dates)}, Already done: {len(completed_dates)}")
    print(f"  Output: {IMAGE_OUTPUT}")
    print()

    for i, date in enumerate(dates):
        if date in completed_dates and not single_day:
            print(f"  [{i+1}/{len(dates)}] {date} — skipping (done)")
            continue

        entry = reflections[date]
        prompt_idx, style_prompt = get_style_prompt(i, style_prompts)

        print(f"  [{i+1}/{len(dates)}] {date} — style prompt #{prompt_idx}")

        if dry_run:
            prompt = build_image_prompt(entry, style_prompt)
            print(f"    [DRY RUN] prompt length: {len(prompt)} chars")
            continue

        image_filename = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                prompt = build_image_prompt(entry, style_prompt)
                raw = invoke_hermes_for_image(prompt)

                location = extract_image_location(raw)
                if not location:
                    print(f"    attempt {attempt}: no image URL/path found in output")
                    print(f"    raw output: {raw[:200]}")
                    if attempt < MAX_RETRIES:
                        time.sleep(3)
                        continue
                    break

                image_filename = save_image_to_artifacts(location, date)
                if not image_filename:
                    print(f"    attempt {attempt}: could not save image from {location[:100]}")
                    if attempt < MAX_RETRIES:
                        time.sleep(3)
                        continue
                    break

                print(f"    generated: {image_filename}")
                break

            except Exception as e:
                print(f"    attempt {attempt} ERROR: {e}")
                if attempt < MAX_RETRIES:
                    time.sleep(3)
                    continue
                break

        result = {
            "date": date,
            "image_filename": image_filename or "",
            "style_ref_image": f"prompt_{prompt_idx}",
            "day_index": i,
            "generated_by": "hermes-agent-fal",
        }

        if single_day:
            results = [r for r in results if r["date"] != date]
        results.append(result)
        save_images(results)
        time.sleep(2)

    total = len(results)
    success = sum(1 for r in results if r.get("image_filename"))
    print(f"\nDone. {total} entries, {success} images generated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate images using Hermes Agent + FAL AI")
    parser.add_argument("--days", type=int, default=None, help="Max days to process")
    parser.add_argument("--day", type=str, default=None, help="Single date (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts only")
    args = parser.parse_args()

    run(max_days=args.days, single_day=args.day, dry_run=args.dry_run)
