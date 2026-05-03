#!/usr/bin/env python3
"""
Generate landscape images for each day using Hermes Agent + FAL AI.

Invokes Hermes Agent via CLI, which uses its image_generate tool internally.
Each day gets a unique style reference image from the tastyyy folder.

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
ARTIFACTS_DIR = PROJECT_DIR / "web" / "public" / "artifacts"
TASTE_DIR = Path("/Users/yyy/Documents/tastyyy")

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


def load_existing_images():
    if IMAGE_OUTPUT.exists():
        with open(IMAGE_OUTPUT) as f:
            return json.load(f)
    return []


def save_images(results):
    with open(IMAGE_OUTPUT, "w") as f:
        json.dump(results, f, indent=2)


def get_style_ref_image(day_index):
    """Map day number (0-indexed) to a style reference image.
    Day 0 -> 1.jpg, Day 1 -> 2.jpg, etc.
    Wraps around if we exceed available images.
    """
    available = sorted(
        [f for f in TASTE_DIR.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg', '.png')],
        key=lambda p: int(p.stem) if p.stem.isdigit() else 999
    )
    if not available:
        return None
    idx = day_index % len(available)
    return available[idx]


def build_image_prompt(reflection_entry, day_index, style_ref_path):
    """Build a prompt for Hermes Agent to generate an image."""
    date = reflection_entry["date"]
    title = reflection_entry.get("title", "")
    reflection = reflection_entry.get("reflection", "")

    if len(reflection) > 600:
        reflection = reflection[:600] + "..."

    prompt = f"""You are generating a landscape artwork for day {day_index + 1} ({date}).

REFLECTION TITLE: "{title}"
REFLECTION TEXT:
{reflection}

STYLE REFERENCE IMAGE: {style_ref_path}

INSTRUCTIONS:
1. First, analyze the style reference image using vision_analyze to understand its specific visual style (colors, composition, textures, techniques).
2. Then craft a detailed image generation prompt that:
   - Captures the EMOTIONAL CONTENT and THEMES from the reflection text above
   - Uses the VISUAL STYLE (colors, composition, textures, techniques) from the reference image
   - Is a landscape (16:9) digital artwork
   - Incorporates these aesthetic elements: cyberpunk, neo-futurist, digital brutalism, glitch art, neon accents, geometric grids, clean vector style
   - Does NOT include any text or words in the image
   - Is abstract/atmospheric, not literal
3. Call image_generate with your crafted prompt and aspect_ratio="landscape"
4. After generating, respond with ONLY the image URL or file path on a single line, nothing else.

IMPORTANT: Your entire response should be ONLY the URL or file path of the generated image. Nothing else."""

    return prompt


def invoke_hermes_for_image(prompt):
    """Call Hermes Agent CLI to generate an image.
    Uses the default agentic model (configured in hermes config)
    since image_generate requires tool-calling capability.
    """
    cmd = [
        HERMES_CLI, "chat",
        "-q", prompt,
        "-Q",
    ]

    env = os.environ.copy()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
            env=env,
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
        # Check for URLs (FAL returns https://... URLs)
        if line.startswith("http://") or line.startswith("https://"):
            if any(ext in line.lower() for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return line
        # Check for local file paths
        if line.startswith("/") and any(line.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            return line
        # Extract from mixed text
        for part in line.split():
            if part.startswith("http") and any(ext in part.lower() for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return part
            if "/" in part and any(part.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return part
    return None


def save_image_to_artifacts(location, date):
    """Download (if URL) or copy (if local) image to web/public/artifacts/."""
    import shutil
    import urllib.request

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    if location.startswith("http://") or location.startswith("https://"):
        ext_map = {".png": ".png", ".jpg": ".jpg", ".jpeg": ".jpeg", ".webp": ".webp"}
        ext = ".png"
        for candidate in ext_map:
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
        ext = src.suffix
        dest_name = f"{date}_fal{ext}"
        dest = ARTIFACTS_DIR / dest_name
        shutil.copy2(src, dest)
        return dest_name


def run(max_days=None, single_day=None, dry_run=False):
    reflections = load_reflections()
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

    print(f"Image generator (uses default agentic model from hermes config)")
    print(f"  Days to process: {len(dates)}, Already done: {len(completed_dates)}")
    print(f"  Style refs: {TASTE_DIR}")
    print(f"  Output: {IMAGE_OUTPUT}")
    print()

    for i, date in enumerate(dates):
        if date in completed_dates and not single_day:
            print(f"  [{i+1}/{len(dates)}] {date} — skipping (done)")
            continue

        entry = reflections[date]
        day_index = i

        style_ref = get_style_ref_image(day_index)
        if not style_ref:
            print(f"  [{i+1}/{len(dates)}] {date} — ERROR: no style reference images found")
            continue

        print(f"  [{i+1}/{len(dates)}] {date} — style ref: {style_ref.name}")

        if dry_run:
            prompt = build_image_prompt(entry, day_index, style_ref)
            print(f"    [DRY RUN] prompt length: {len(prompt)} chars")
            continue

        image_filename = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                prompt = build_image_prompt(entry, day_index, style_ref)
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
            "style_ref_image": style_ref.name if style_ref else "",
            "day_index": day_index,
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
